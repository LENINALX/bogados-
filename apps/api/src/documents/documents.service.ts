import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  paginateParams,
  PaginationQueryDto,
  toPaginated,
} from '../common/dto/pagination.dto';
import { isAllowedUpload, MAX_UPLOAD_BYTES } from './upload.config';
import { attachmentDisposition } from '../common/utils/content-disposition';

/** Campos de Document que se devuelven al cliente (sin storagePath ni tenantId). */
export const documentPublicSelect = {
  id: true,
  caseId: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  sharedWithClient: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.DocumentSelect;

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  async list(caseId: string, user: JwtPayloadUser, query: PaginationQueryDto) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const { page, pageSize, skip, take } = paginateParams(query);
    const where: Prisma.DocumentWhereInput = {
      caseId: c.id,
      tenantId: user.tenantId,
    };
    if (!isStaff(user.role)) where.sharedWithClient = true;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        select: documentPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return toPaginated(items, total, page, pageSize);
  }

  async upload(
    caseId: string,
    file: Express.Multer.File | undefined,
    sharedWithClientRaw: string | undefined,
    user: JwtPayloadUser,
  ) {
    // Multer ya aplica estos límites (upload.config.ts); se repiten por si el
    // servicio se invoca sin pasar por el interceptor.
    if (!file) throw new BadRequestException('Archivo requerido');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Archivo demasiado grande (máx. 10 MB)');
    }
    if (!isAllowedUpload(file.originalname)) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }

    const c = await getAccessibleCase(this.prisma, caseId, user);

    let sharedWithClient = sharedWithClientRaw === 'true';
    if (user.role === Role.CLIENTE) sharedWithClient = true;

    const { storagePath } = await this.storage.save(
      user.tenantId,
      c.id,
      file.originalname,
      file.buffer,
    );

    // El staff que comparte avisa al cliente; lo que sube el cliente o lo
    // interno avisa al abogado del caso. Nunca se notifica a quien sube.
    const notifyClient = user.role !== Role.CLIENTE && sharedWithClient;
    const recipientId = notifyClient ? c.clientId : c.lawyerId;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const doc = await tx.document.create({
          data: {
            tenantId: user.tenantId,
            caseId: c.id,
            fileName: file.originalname,
            mimeType: file.mimetype || 'application/octet-stream',
            sizeBytes: file.size,
            storagePath,
            sharedWithClient,
            uploadedById: user.id,
          },
          select: documentPublicSelect,
        });

        await this.activity.log(
          {
            tenantId: user.tenantId,
            caseId: c.id,
            actorId: user.id,
            type: 'DOC_UPLOADED',
            summary: `Documento: ${doc.fileName}`,
            meta: { documentId: doc.id, sharedWithClient },
          },
          tx,
        );

        if (recipientId && recipientId !== user.id) {
          await this.notifications.create(
            {
              userId: recipientId,
              title: notifyClient ? 'Documento compartido' : 'Nuevo documento',
              body: notifyClient
                ? `Se compartió "${doc.fileName}" en el caso "${c.title}"`
                : `Se subió "${doc.fileName}" en el caso "${c.title}"`,
              meta: {
                type: notifyClient ? 'DOC_SHARED' : 'DOC_UPLOADED',
                caseId: c.id,
                documentId: doc.id,
              },
            },
            tx,
          );
        }

        return doc;
      });
    } catch (err) {
      // Sin registro en BD el archivo quedaría huérfano en disco
      await this.storage.remove(storagePath);
      throw err;
    }
  }

  async download(documentId: string, user: JwtPayloadUser) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId: user.tenantId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    await getAccessibleCase(this.prisma, doc.caseId, user);

    if (!isStaff(user.role) && !doc.sharedWithClient) {
      throw new ForbiddenException('Sin permiso para este documento');
    }

    // Sin esta comprobación, StreamableFile responde 400 con el mensaje de ENOENT (incluye la ruta)
    if (!(await this.storage.exists(doc.storagePath))) {
      throw new NotFoundException('Archivo no disponible');
    }

    const stream = createReadStream(this.storage.resolvePath(doc.storagePath));
    return new StreamableFile(stream, {
      type: doc.mimeType,
      disposition: attachmentDisposition(doc.fileName),
      length: doc.sizeBytes,
    });
  }
}
