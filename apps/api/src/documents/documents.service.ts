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
import {
  canonicalMimeType,
  contentMatchesExtension,
  isAllowedUpload,
  isDeclaredMimeCoherent,
  MAX_UPLOAD_BYTES,
  sanitizeUploadFileName,
} from './upload.config';
import { attachmentDisposition } from '../common/utils/content-disposition';
import { Document as WordDocument, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';
import { GenerateDocumentDto } from './dto/generate-document.dto';

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
    if (!file.size || !file.buffer?.length) throw new BadRequestException('El archivo está vacío');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Archivo demasiado grande (máx. 10 MB)');
    }
    const fileName = sanitizeUploadFileName(file.originalname);
    if (!fileName || !isAllowedUpload(fileName)) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }
    if (!isDeclaredMimeCoherent(fileName, file.mimetype)) {
      throw new BadRequestException('El tipo del archivo no coincide con su extensión');
    }
    // El nombre no basta: un HTML o un ejecutable renombrado a .pdf no pasa
    if (!contentMatchesExtension(fileName, file.buffer)) {
      throw new BadRequestException('El contenido del archivo no corresponde a su extensión');
    }

    const c = await getAccessibleCase(this.prisma, caseId, user);

    let sharedWithClient = sharedWithClientRaw === 'true';
    if (user.role === Role.CLIENTE) sharedWithClient = true;

    const { storagePath } = await this.storage.save(
      user.tenantId,
      c.id,
      fileName,
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
            fileName,
            // Nunca el tipo que declaró el navegador: se deduce de la extensión validada
            mimeType: canonicalMimeType(fileName),
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

  async generateFromTemplate(
    caseId: string,
    input: GenerateDocumentDto,
    user: JwtPayloadUser,
  ) {
    if (!isStaff(user.role)) throw new ForbiddenException('Solo el equipo puede generar escritos');

    const c = await getAccessibleCase(this.prisma, caseId, user);
    const client = c.clientId
      ? await this.prisma.user.findUnique({
          where: { id: c.clientId },
          select: { name: true },
        })
      : null;
    const lawyer = c.lawyerId
      ? await this.prisma.user.findUnique({
          where: { id: c.lawyerId },
          select: { name: true },
        })
      : null;
    const template = documentTemplate(input.template);
    const fileName = `escrito-${input.template}-${new Date().toISOString().slice(0, 10)}.${input.format}`;
    const values = {
      title: template.title,
      court: input.court.trim(),
      client: client?.name ?? '[NOMBRE DEL CLIENTE]',
      opposingParty: input.opposingParty?.trim() || '[CONTRAPARTE]',
      processNumber: c.processNumber ?? '[NÚMERO DE PROCESO]',
      caseTitle: c.title,
      matterType: c.matterType ?? '[MATERIA]',
      lawyer: lawyer?.name ?? user.name ?? '[ABOGADO/A]',
      date: new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeZone: 'America/Guayaquil' }).format(new Date()),
      sections: template.sections,
    };
    const paragraphs = [
      `SEÑOR/A JUEZ/A DE ${values.court.toLocaleUpperCase('es-EC')}`,
      values.title.toLocaleUpperCase('es-EC'),
      `Proceso No. ${values.processNumber}`,
      `Materia: ${values.matterType}`,
      '',
      `${template.intro(values.client, values.opposingParty, values.caseTitle)}`,
      ...template.sections.flatMap(([heading, body]) => [heading.toLocaleUpperCase('es-EC'), body]),
      `Notificaciones: [COMPLETAR CASILLERO JUDICIAL Y CORREO]`,
      `${values.date}`,
      '',
      '______________________________',
      values.lawyer,
      '[MATRÍCULA / FORO DE ABOGADOS]',
      '',
      'BORRADOR: revisar y completar los datos, fundamentos y anexos antes de su presentación.',
    ];
    const buffer =
      input.format === 'docx'
        ? await Packer.toBuffer(
            new WordDocument({
              sections: [
                {
                  children: paragraphs.map((text, index) =>
                    index === 0
                      ? new Paragraph({
                          heading: HeadingLevel.HEADING_1,
                          children: [new TextRun({ text, bold: true })],
                        })
                      : new Paragraph({ children: [new TextRun(text)] }),
                  ),
                },
              ],
            }),
          )
        : await renderPdf(paragraphs);

    return this.upload(
      caseId,
      {
        originalname: fileName,
        mimetype:
          input.format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf',
        size: buffer.length,
        buffer,
      } as Express.Multer.File,
      'false',
      user,
    );
  }

  async download(documentId: string, user: JwtPayloadUser) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId: user.tenantId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Siempre la misma respuesta: no se distingue «no existe», «es de otro caso» o «no está compartido»
    await getAccessibleCase(this.prisma, doc.caseId, user).catch(() => {
      throw new NotFoundException('Documento no encontrado');
    });

    if (!isStaff(user.role) && !doc.sharedWithClient) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Sin esta comprobación, StreamableFile responde 400 con el mensaje de ENOENT (incluye la ruta)
    if (!(await this.storage.exists(doc.storagePath))) {
      throw new NotFoundException('Archivo no disponible');
    }

    const stream = createReadStream(this.storage.resolvePath(doc.storagePath));
    return new StreamableFile(stream, {
      // Por la extensión, no por lo guardado: los documentos antiguos guardaban el tipo
      // que declaraba el navegador (podía ser text/html)
      type: canonicalMimeType(doc.fileName),
      disposition: attachmentDisposition(doc.fileName),
      length: doc.sizeBytes,
    });
  }
}

function documentTemplate(template: GenerateDocumentDto['template']) {
  const templates = {
    demanda: {
      title: 'Demanda',
      intro: (client: string, opposing: string, caseTitle: string) =>
        `Yo, ${client}, comparezco en relación con ${caseTitle} y propongo demanda en contra de ${opposing}.`,
      sections: [
        ['Pretensión', '[Describir con precisión lo que se solicita al juzgado.]'],
        ['Fundamentos de hecho', '[Ordenar cronológicamente los hechos y relacionar la prueba.]'],
        ['Fundamentos de derecho', '[Completar las normas aplicables y su relación con los hechos.]'],
        ['Anuncio de prueba', '[Individualizar los medios probatorios y su finalidad.]'],
        ['Petición', '[Precisar las medidas y decisión que se solicitan.]'],
      ],
    },
    contestacion: {
      title: 'Contestación a la demanda',
      intro: (client: string, opposing: string, caseTitle: string) =>
        `Yo, ${client}, comparezco dentro del proceso ${caseTitle}, iniciado por ${opposing}, y presento contestación.`,
      sections: [
        ['Pronunciamiento sobre los hechos', '[Responder individualmente cada hecho de la demanda.]'],
        ['Excepciones', '[Indicar, fundamentar y sustentar las excepciones que correspondan.]'],
        ['Anuncio de prueba', '[Individualizar la prueba de descargo y su finalidad.]'],
        ['Petición', '[Precisar la decisión solicitada al juzgado.]'],
      ],
    },
    impulso: {
      title: 'Escrito de impulso procesal',
      intro: (client: string, _opposing: string, caseTitle: string) =>
        `Yo, ${client}, dentro del proceso ${caseTitle}, comparezco y solicito se disponga el impulso procesal correspondiente.`,
      sections: [
        ['Antecedentes', '[Indicar la última actuación procesal y la fecha pertinente.]'],
        ['Solicitud', '[Señalar la actuación concreta que se solicita y su fundamento.]'],
      ],
    },
    poder: {
      title: 'Poder',
      intro: (client: string, _opposing: string, caseTitle: string) =>
        `Yo, ${client}, en relación con ${caseTitle}, confiero poder a favor de [NOMBRE COMPLETO DEL APODERADO/A].`,
      sections: [
        ['Facultades', '[Detallar expresamente las facultades que se confieren.]'],
        ['Vigencia y alcance', '[Completar vigencia, alcance y formalidades requeridas.]'],
      ],
    },
  } satisfies Record<GenerateDocumentDto['template'], {
    title: string;
    intro: (client: string, opposing: string, caseTitle: string) => string;
    sections: [string, string][];
  }>;
  return templates[template];
}

function renderPdf(paragraphs: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 72, bufferPages: true });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    paragraphs.forEach((text, index) => {
      if (!text) {
        pdf.moveDown(0.7);
      } else {
        pdf
          .font(index === 0 ? 'Times-Bold' : 'Times-Roman')
          .fontSize(index === 0 ? 13 : 11)
          .text(text, { align: index === 0 ? 'center' : 'left' })
          .moveDown(0.45);
      }
    });
    pdf.end();
  });
}
