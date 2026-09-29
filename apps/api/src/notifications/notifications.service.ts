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

  async create(input: NotifyInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        meta: input.meta ?? undefined,
      },
    });
  }

  /** Crea notificaciones para varios destinatarios (omite nulos/duplicados). */
  async notifyMany(userIds: Array<string | null | undefined>, input: Omit<NotifyInput, 'userId'>) {
    const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (unique.length === 0) return [];
    return Promise.all(
      unique.map((userId) =>
        this.create({ userId, title: input.title, body: input.body, meta: input.meta }),
      ),
    );
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
