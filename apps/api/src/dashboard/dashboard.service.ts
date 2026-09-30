import { Injectable } from '@nestjs/common';
import { CaseStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async stats(user: JwtPayloadUser) {
    const tenantId = user.tenantId;
    const caseWhere: { tenantId: string; lawyerId?: string; clientId?: string } = {
      tenantId,
    };
    if (user.role === Role.ABOGADO) caseWhere.lawyerId = user.id;
    if (user.role === Role.CLIENTE) caseWhere.clientId = user.id;

    const caseIds =
      user.role === Role.ADMIN
        ? null
        : (
            await this.prisma.case.findMany({
              where: caseWhere,
              select: { id: true },
            })
          ).map((c) => c.id);

    const docWhere =
      caseIds === null
        ? { tenantId }
        : { tenantId, caseId: { in: caseIds } };
    const msgWhere =
      caseIds === null
        ? { tenantId }
        : { tenantId, caseId: { in: caseIds } };

    const [
      casesByStatus,
      documentsCount,
      messagesCount,
      usersByRole,
      openTasks,
      overdueTasks,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.case.groupBy({
        by: ['status'],
        where: caseWhere,
        _count: { _all: true },
      }),
      this.prisma.document.count({ where: docWhere }),
      this.prisma.message.count({ where: msgWhere }),
      user.role === Role.ADMIN
        ? this.prisma.user.groupBy({
            by: ['role'],
            where: { tenantId, active: true },
            _count: { _all: true },
          })
        : Promise.resolve([] as { role: Role; _count: { _all: number } }[]),
      this.prisma.caseTask.count({
        where: {
          tenantId,
          done: false,
          ...(caseIds === null ? {} : { caseId: { in: caseIds } }),
        },
      }),
      this.prisma.caseTask.count({
        where: {
          tenantId,
          done: false,
          dueAt: { lt: new Date() },
          ...(caseIds === null ? {} : { caseId: { in: caseIds } }),
        },
      }),
      this.prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    const statusCounts: Record<CaseStatus, number> = {
      intake: 0,
      abierto: 0,
      en_pausa: 0,
      cerrado: 0,
    };
    for (const row of casesByStatus) {
      statusCounts[row.status] = row._count._all;
    }

    const roleCounts: Record<Role, number> = {
      ADMIN: 0,
      ABOGADO: 0,
      CLIENTE: 0,
    };
    for (const row of usersByRole) {
      roleCounts[row.role] = row._count._all;
    }

    const casesTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return {
      cases: { total: casesTotal, byStatus: statusCounts },
      documents: documentsCount,
      messages: messagesCount,
      users: user.role === Role.ADMIN ? { byRole: roleCounts } : undefined,
      tasks: { open: openTasks, overdue: overdueTasks },
      notifications: { unread: unreadNotifications },
    };
  }
}
