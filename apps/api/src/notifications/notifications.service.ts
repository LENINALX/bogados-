import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import {
  paginateParams,
  toPaginated,
} from '../common/dto/pagination.dto';
import { ListNotificationsQueryDto } from './dto/notification.dto';

export type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  meta?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /** `db`: cliente de una transacción en curso, para notificar junto con la acción. */
  async create(input: NotifyInput, db: Prisma.TransactionClient = this.prisma) {
    return db.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        meta: input.meta ?? undefined,
      },
    });
  }

  /** Crea notificaciones para varios destinatarios (omite nulos/duplicados). Devuelve cuántas. */
  async notifyMany(
    userIds: Array<string | null | undefined>,
    input: Omit<NotifyInput, 'userId'>,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (unique.length === 0) return 0;
    const { count } = await db.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        title: input.title,
        body: input.body,
        meta: input.meta ?? undefined,
      })),
    });
    return count;
  }

  async list(user: JwtPayloadUser, query: ListNotificationsQueryDto) {
    const { page, pageSize, skip, take } = paginateParams(query);
    const where: Prisma.NotificationWhereInput = { userId: user.id };
    if (query.unreadOnly) where.read = false;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return toPaginated(items, total, page, pageSize);
  }

  async markRead(id: string, user: JwtPayloadUser) {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead(user: JwtPayloadUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
