import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginateParams, toPaginated } from '../common/dto/pagination.dto';
import { ClientMeta, describeUserAgent } from './client-meta';

/** Éxito: cómo entró. Fallo: por qué no pudo. */
export type LoginReason =
  | 'password'
  | 'two_factor'
  | 'bad_password'
  | 'unknown_user'
  | 'inactive'
  | 'bad_code'
  | 'expired_code';

export type LoginEventInput = ClientMeta & {
  tenantId: string;
  userId?: string | null;
  email: string;
  success: boolean;
  reason: LoginReason;
};

/** Fallos del primer paso (contraseña): los que cuentan para bloquear la cuenta. */
export const PASSWORD_FAILURES: LoginReason[] = ['bad_password', 'unknown_user', 'inactive'];

const eventSelect = {
  id: true,
  email: true,
  success: true,
  reason: true,
  ip: true,
  userAgent: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true } },
} as const;

type EventRow = Prisma.LoginEventGetPayload<{ select: typeof eventSelect }>;

/** El navegador ya descrito: la web solo lo muestra. */
function present(e: EventRow) {
  return { ...e, device: describeUserAgent(e.userAgent) };
}

@Injectable()
export class LoginEventsService {
  constructor(private prisma: PrismaService) {}

  record(input: LoginEventInput, db: Prisma.TransactionClient = this.prisma) {
    return db.loginEvent.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        email: input.email,
        success: input.success,
        reason: input.reason,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  /**
   * Fallos de contraseña de una cuenta (firma + email) desde su último acceso correcto,
   * dentro de la ventana. Cuenta también los emails inexistentes: así el bloqueo no
   * revela qué cuentas existen. `oldest` dice cuándo se libera el bloqueo.
   */
  async recentPasswordFailures(tenantId: string, email: string, windowMs: number) {
    const since = new Date(Date.now() - windowMs);
    const lastSuccess = await this.prisma.loginEvent.findFirst({
      where: { tenantId, email, success: true, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const where: Prisma.LoginEventWhereInput = {
      tenantId,
      email,
      success: false,
      reason: { in: PASSWORD_FAILURES },
      createdAt: lastSuccess ? { gt: lastSuccess.createdAt } : { gte: since },
    };
    const [count, oldest] = await this.prisma.$transaction([
      this.prisma.loginEvent.count({ where }),
      this.prisma.loginEvent.findFirst({ where, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);
    return { count, oldest: oldest?.createdAt ?? null };
  }

  async recentForUser(userId: string, take = 10) {
    const rows = await this.prisma.loginEvent.findMany({
      where: { userId },
      select: eventSelect,
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map(present);
  }

  /** Registro de la firma para el admin, con filtro por resultado y usuario. */
  async listForTenant(
    tenantId: string,
    query: { result?: 'success' | 'failed'; userId?: string; page?: number; pageSize?: number },
  ) {
    const { page, pageSize, skip, take } = paginateParams(query);
    const where: Prisma.LoginEventWhereInput = { tenantId };
    if (query.result) where.success = query.result === 'success';
    if (query.userId) where.userId = query.userId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, items, failedLast24h] = await this.prisma.$transaction([
      this.prisma.loginEvent.count({ where }),
      this.prisma.loginEvent.findMany({ where, select: eventSelect, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.loginEvent.count({ where: { tenantId, success: false, createdAt: { gte: since } } }),
    ]);
    return { ...toPaginated(items.map(present), total, page, pageSize), failedLast24h };
  }
}
