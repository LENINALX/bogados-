import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';
import { paginateParams, toPaginated } from '../common/dto/pagination.dto';
import { addDaysYmd, zonedToUtc } from '../appointments/time';

export type ActivityLogInput = {
  tenantId: string;
  /** Sin caso: actividad de la firma (usuarios, citas, ajustes) */
  caseId?: string | null;
  actorId?: string | null;
  type: string;
  summary: string;
  meta?: Prisma.InputJsonValue;
};

/**
 * Registra una acción. Sirve en cualquier servicio sin inyectar ActivityService: basta con
 * pasarle el cliente de la transacción en curso, para que acción y registro vayan juntos.
 */
export function recordActivity(db: Prisma.TransactionClient, input: ActivityLogInput) {
  return db.activityEvent.create({
    data: {
      tenantId: input.tenantId,
      caseId: input.caseId ?? null,
      actorId: input.actorId ?? null,
      type: input.type,
      summary: input.summary,
      meta: input.meta ?? undefined,
    },
  });
}

/** Grupos del filtro de Admin › Actividad. Un tipo sin grupo sale solo en «Todo». */
export const ACTIVITY_CATEGORIES = {
  casos: [
    'CASE_CREATED',
    'STATUS_CHANGED',
    'ASSIGNED',
    'PROCESS_LINKED',
    'CASE_REQUESTED',
    'CASE_ACCEPTED',
    'CASE_POSTPONED',
    'CASE_REJECTED',
  ],
  documentos: ['DOC_UPLOADED'],
  notas: ['NOTE_ADDED'],
  mensajes: ['MESSAGE_SENT'],
  citas: ['APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED'],
  usuarios: ['USER_CREATED', 'USER_INVITED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED'],
  ajustes: ['SETTINGS_UPDATED', 'HOLIDAY_ADDED', 'HOLIDAY_REMOVED', 'HOLIDAYS_LOADED'],
} as const;
export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;

export type FirmActivityQuery = {
  category?: ActivityCategory;
  actorId?: string;
  /** Días en la hora de la firma, ambos incluidos */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  /** `db`: cliente de una transacción en curso, para registrar junto con la acción. */
  async log(input: ActivityLogInput, db: Prisma.TransactionClient = this.prisma) {
    return recordActivity(db, input);
  }

  /** Toda la actividad de la firma, para el admin (el controlador lo restringe). */
  async listForTenant(tenantId: string, query: FirmActivityQuery) {
    const { page, pageSize, skip, take } = paginateParams(query);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } });
    const where: Prisma.ActivityEventWhereInput = { tenantId };
    if (query.category) where.type = { in: [...ACTIVITY_CATEGORIES[query.category]] };
    if (query.actorId) where.actorId = query.actorId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: zonedToUtc(query.from, 0, tenant.timezone) }),
        // «Hasta» incluye todo ese día: hasta el comienzo del siguiente
        ...(query.to && { lt: zonedToUtc(addDaysYmd(query.to, 1), 0, tenant.timezone) }),
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.activityEvent.count({ where }),
      this.prisma.activityEvent.findMany({
        where,
        select: {
          id: true,
          type: true,
          summary: true,
          createdAt: true,
          actor: { select: { id: true, name: true, role: true } },
          case: { select: { id: true, title: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);
    return toPaginated(items, total, page, pageSize);
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
