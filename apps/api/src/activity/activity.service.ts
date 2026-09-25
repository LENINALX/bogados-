import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';

export type ActivityLogInput = {
  tenantId: string;
  caseId: string;
  actorId?: string | null;
  type: string;
  summary: string;
  meta?: Prisma.InputJsonValue;
};

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(input: ActivityLogInput) {
    return this.prisma.activityEvent.create({
      data: {
        tenantId: input.tenantId,
        caseId: input.caseId,
        actorId: input.actorId ?? null,
        type: input.type,
        summary: input.summary,
        meta: input.meta ?? undefined,
      },
    });
  }

  async timeline(caseId: string, user: JwtPayloadUser) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const events = await this.prisma.activityEvent.findMany({
      where: { caseId: c.id, tenantId: user.tenantId },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Clientes no ven eventos de notas internas
    if (!isStaff(user.role)) {
      return events.filter((e) => {
        if (e.type === 'NOTE_ADDED') {
          const meta = e.meta as { isInternal?: boolean } | null;
          return meta?.isInternal !== true;
        }
        return true;
      });
    }
    return events;
  }
}
