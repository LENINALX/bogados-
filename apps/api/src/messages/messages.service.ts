import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { ActivityService } from '../activity/activity.service';
import { CreateMessageDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async list(caseId: string, user: JwtPayloadUser) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    return this.prisma.message.findMany({
      where: { caseId: c.id, tenantId: user.tenantId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
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

    return message;
  }
}
