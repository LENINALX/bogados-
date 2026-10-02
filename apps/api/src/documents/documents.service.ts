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
        include: { uploadedBy: { select: { id: true, name: true } } },
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
    if (!file) throw new BadRequestException('Archivo requerido');
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('Archivo demasiado grande (máx. 10 MB)');
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

    const doc = await this.prisma.document.create({
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
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await this.activity.log({
      tenantId: user.tenantId,
      caseId: c.id,
      actorId: user.id,
      type: 'DOC_UPLOADED',
      summary: `Documento: ${doc.fileName}`,
      meta: { documentId: doc.id, sharedWithClient },
    });

    if (sharedWithClient && c.clientId && c.clientId !== user.id) {
      await this.notifications.create({
        userId: c.clientId,
        title: 'Documento compartido',
        body: `Se compartió "${doc.fileName}" en el caso "${c.title}"`,
        meta: {
          type: 'DOC_SHARED',
          caseId: c.id,
          documentId: doc.id,
        },
      });
    } else if (!sharedWithClient && c.lawyerId && c.lawyerId !== user.id) {
      await this.notifications.create({
        userId: c.lawyerId,
        title: 'Nuevo documento',
        body: `Se subió "${doc.fileName}" en el caso "${c.title}"`,
        meta: {
          type: 'DOC_UPLOADED',
          caseId: c.id,
          documentId: doc.id,
        },
      });
    }

    return doc;
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

    const stream = createReadStream(this.storage.resolvePath(doc.storagePath));
    return {
      file: new StreamableFile(stream, {
        type: doc.mimeType,
        disposition: `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        length: doc.sizeBytes,
      }),
      doc,
    };
  }
}
