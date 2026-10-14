import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ClientUpdatesService } from '../notifications/client-updates.service';
import { CreateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private notifications: NotificationsService,
    private clientUpdates: ClientUpdatesService,
  ) {}

  async list(caseId: string, user: JwtPayloadUser) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const where: { caseId: string; tenantId: string; isInternal?: boolean } = {
      caseId: c.id,
      tenantId: user.tenantId,
    };
    if (!isStaff(user.role)) {
      where.isInternal = false;
    }
    return this.prisma.caseNote.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(caseId: string, dto: CreateNoteDto, user: JwtPayloadUser) {
    if (!isStaff(user.role)) {
      throw new ForbiddenException('Los clientes no pueden crear notas internas');
    }
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const isInternal = dto.isInternal ?? true;
    // Una nota visible es una novedad para el cliente: se le avisa en el portal y, si se pide, por email
    const clientId = !isInternal && c.clientId !== user.id ? c.clientId : null;
    const emailClient = Boolean(clientId) && dto.notifyClient !== false;

    const note = await this.prisma.$transaction(async (tx) => {
      const note = await tx.caseNote.create({
        data: {
          tenantId: user.tenantId,
          caseId: c.id,
          authorId: user.id,
          body: dto.body,
          isInternal,
        },
        include: { author: { select: { id: true, name: true } } },
      });

      await this.activity.log(
        {
          tenantId: user.tenantId,
          caseId: c.id,
          actorId: user.id,
          type: 'NOTE_ADDED',
          summary: note.isInternal ? 'Nota interna agregada' : 'Nota visible al cliente',
          meta: {
            noteId: note.id,
            isInternal: note.isInternal,
            ...(emailClient ? { emailedClient: true } : {}),
          },
        },
        tx,
      );

      if (clientId) {
        await this.notifications.create(
          {
            userId: clientId,
            title: 'Novedad en tu caso',
            body: `"${c.title}": ${note.body.length > 120 ? `${note.body.slice(0, 117)}...` : note.body}`,
            meta: { type: 'CASE_UPDATE', caseId: c.id, noteId: note.id },
          },
          tx,
        );
      }

      return note;
    });

    if (emailClient) await this.clientUpdates.email(c.id, { kind: 'note', body: note.body });
    return note;
  }
}
