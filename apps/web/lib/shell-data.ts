import { CASE_STATUSES, CaseStatus, OPEN_CASE_REQUEST_STATES } from "@bogados/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Datos de la barra lateral: recuentos junto a cada enlace y los casos recientes.
 * Consultas pequeñas (count/groupBy/take 5) y siempre acotadas al bufete y al rol.
 */

export type ShellUser = { id: string; role: string; tenantId: string };
export type ShellCase = { id: string; title: string; status: CaseStatus };

export type ShellData = {
  /** Recuento por href de navegación (p. ej. "/tareas" → plazos vencidos) */
  counts: Record<string, number>;
  /** hrefs cuyo recuento indica un problema (se pinta en rojo) */
  alerts: string[];
  /** Solo el despacho: casos por estado */
  byStatus?: Record<CaseStatus, number>;
  /** Solo el admin: solicitudes de clientes pendientes de decidir */
  openRequests?: number;
  recentCases: ShellCase[];
};

const ACTIVE: CaseStatus[] = ["intake", "abierto", "en_pausa"];
const UPCOMING_MS = 7 * 24 * 60 * 60 * 1000;

export async function getShellData(user: ShellUser): Promise<ShellData> {
  return user.role === "CLIENTE" ? clientData(user) : staffData(user);
}

async function staffData({ id, role, tenantId }: ShellUser): Promise<ShellData> {
  const isAdmin = role === "ADMIN";
  const now = new Date();
  const scope: Prisma.CaseWhereInput = isAdmin ? { tenantId } : { tenantId, lawyerId: id };
  const taskScope: Prisma.CaseTaskWhereInput = isAdmin
    ? { tenantId }
    : { tenantId, OR: [{ assigneeId: id }, { case: { lawyerId: id } }] };

  const [statusGroups, upcoming, overdue, requests, recent] = await Promise.all([
    prisma.case.groupBy({ by: ["status"], where: scope, _count: true }),
    prisma.appointment.count({
      where: {
        tenantId,
        ...(isAdmin ? {} : { lawyerId: id }),
        status: { in: ["pendiente", "confirmada"] },
        startsAt: { gte: now, lt: new Date(now.getTime() + UPCOMING_MS) },
      },
    }),
    prisma.caseTask.count({ where: { ...taskScope, done: false, dueAt: { lt: now } } }),
    isAdmin
      ? prisma.case.count({ where: { tenantId, requestState: { in: [...OPEN_CASE_REQUEST_STATES] } } })
      : Promise.resolve(0),
    prisma.case.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true },
    }),
  ]);

  const byStatus = Object.fromEntries(CASE_STATUSES.map((s) => [s, 0])) as Record<CaseStatus, number>;
  for (const g of statusGroups) byStatus[g.status as CaseStatus] = g._count;

  return {
    counts: {
      "/dashboard": ACTIVE.reduce((sum, s) => sum + byStatus[s], 0),
      "/agenda": upcoming,
      "/tareas": overdue,
    },
    alerts: overdue > 0 ? ["/tareas"] : [],
    byStatus,
    openRequests: isAdmin ? requests : undefined,
    recentCases: recent.map((c) => ({ ...c, status: c.status as CaseStatus })),
  };
}

async function clientData({ id, tenantId }: ShellUser): Promise<ShellData> {
  const now = new Date();
  const [cases, open, upcoming] = await Promise.all([
    prisma.case.findMany({
      where: { tenantId, clientId: id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, status: true },
    }),
    // Igual que el resumen del portal: una solicitud sin aceptar (o rechazada) no es un caso activo
    prisma.case.count({
      where: {
        tenantId,
        clientId: id,
        status: { not: "cerrado" },
        OR: [{ requestState: null }, { requestState: "aceptada" }],
      },
    }),
    prisma.appointment.count({
      where: { tenantId, clientId: id, status: { in: ["pendiente", "confirmada"] }, startsAt: { gte: now } },
    }),
  ]);
  return {
    counts: {
      "/portal": open,
      "/portal/citas": upcoming,
    },
    alerts: [],
    recentCases: cases.map((c) => ({ ...c, status: c.status as CaseStatus })),
  };
}
