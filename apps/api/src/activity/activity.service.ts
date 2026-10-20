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

  /** `db`: cliente de una transacción en curso, para registrar junto con la acción. */
  async log(input: ActivityLogInput, db: Prisma.TransactionClient = this.prisma) {
    return db.activityEvent.create({
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

    if (isStaff(user.role)) return events;
    return events.filter(isVisibleToClient);
  }
}

/**
 * Eventos que puede ver el cliente (lista blanca, igual que el portal de la web):
 * un tipo nuevo queda oculto hasta que se decida mostrarlo. Las notas internas y
 * los documentos no compartidos tampoco, ni siquiera su nombre.
 */
export const CLIENT_VISIBLE_EVENTS = new Set([
  'CASE_CREATED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'DOC_UPLOADED',
  'PROCESS_LINKED',
  'CASE_REQUESTED',
  'CASE_ACCEPTED',
  'CASE_POSTPONED',
  'CASE_REJECTED',
  'NOTE_ADDED',
  'MESSAGE_SENT',
]);

export function isVisibleToClient(event: { type: string; meta: Prisma.JsonValue | null }): boolean {
  if (!CLIENT_VISIBLE_EVENTS.has(event.type)) return false;
  const meta = (event.meta ?? {}) as { isInternal?: unknown; sharedWithClient?: unknown };
  if (event.type === 'NOTE_ADDED') return meta.isInternal === false;
  if (event.type === 'DOC_UPLOADED') return meta.sharedWithClient === true;
  return true;
}
