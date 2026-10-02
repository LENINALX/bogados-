import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  paginateParams,
  toPaginated,
} from '../common/dto/pagination.dto';
import { CreateMessageDto, ListMessagesQueryDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  async list(caseId: string, user: JwtPayloadUser, query: ListMessagesQueryDto) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const { page, pageSize, skip, take } = paginateParams({
      page: query.page,
      pageSize: query.pageSize ?? 50,
    });

    const where = { caseId: c.id, tenantId: user.tenantId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
    ]);

    return toPaginated(items, total, page, pageSize);
  }

  async create(caseId: string, dto: CreateMessageDto, user: JwtPayloadUser) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const message = await this.prisma.message.create({
      data: {
        tenantId: user.tenantId,
        caseId: c.id,
        senderId: user.id,
        body: dto.body,
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    await this.activity.log({
      tenantId: user.tenantId,
      caseId: c.id,
      actorId: user.id,
      type: 'MESSAGE_SENT',
      summary: 'Mensaje enviado',
      meta: { messageId: message.id },
    });

    const recipients = [c.lawyerId, c.clientId].filter(
      (id): id is string => Boolean(id) && id !== user.id,
    );
    const preview = dto.body.length > 120 ? `${dto.body.slice(0, 117)}...` : dto.body;
    await this.notifications.notifyMany(recipients, {
      title: 'Nuevo mensaje',
      body: `${user.name}: ${preview}`,
      meta: {
        type: 'NEW_MESSAGE',
        caseId: c.id,
        messageId: message.id,
      },
    });

    return message;
  }
}
