import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { dueState, formatDue } from "@/lib/tasks";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DueBadge } from "@/components/DueBadge";
import {
  CasesByStatusChart,
  LawyerLoadChart,
  LawyerLoadRow,
  StatTile,
} from "@/components/DashboardCharts";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";

const ACTIVE_STATUSES = ["intake", "abierto", "en_pausa"] as const satisfies readonly CaseStatus[];
const UPCOMING_DAYS = 7;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;
  const isAdmin = role === "ADMIN";

  const status = searchParams.status as CaseStatus | undefined;
  const validStatus = status && CASE_STATUSES.includes(status) ? status : undefined;
  const q = searchParams.q?.trim();

  const scope: Prisma.CaseWhereInput = isAdmin ? { tenantId } : { tenantId, lawyerId: userId };
  const where: Prisma.CaseWhereInput = { ...scope };
  if (validStatus) where.status = validStatus;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const taskScope: Prisma.CaseTaskWhereInput = isAdmin
    ? { tenantId }
    : { tenantId, OR: [{ assigneeId: userId }, { case: { lawyerId: userId } }] };
  const now = new Date();
  const horizon = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);

  const [cases, counts, openTasks, overdueTasks, documents, upcoming] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        client: { select: { name: true } },
        lawyer: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.case.groupBy({ by: ["status"], where: scope, _count: true }),
    prisma.caseTask.count({ where: { ...taskScope, done: false } }),
    prisma.caseTask.count({ where: { ...taskScope, done: false, dueAt: { lt: now } } }),
    prisma.document.count({ where: isAdmin ? { tenantId } : { tenantId, case: { lawyerId: userId } } }),
    prisma.caseTask.findMany({
      where: { ...taskScope, done: false, dueAt: { lte: horizon } },
      include: { case: { select: { id: true, title: true } }, assignee: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
  ]);

  const byStatus = Object.fromEntries(CASE_STATUSES.map((s) => [s, 0])) as Record<CaseStatus, number>;
  for (const c of counts) byStatus[c.status as CaseStatus] = c._count;
  const activeCases = ACTIVE_STATUSES.reduce((a, s) => a + byStatus[s], 0);

  let lawyerRows: LawyerLoadRow[] = [];
  if (isAdmin) {
    const [staff, load, overdueByAssignee] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, active: true, role: { in: ["ADMIN", "ABOGADO"] } },
        select: { id: true, name: true, role: true },
      }),
      prisma.case.groupBy({
        by: ["lawyerId", "status"],
        where: { tenantId, status: { in: [...ACTIVE_STATUSES] }, lawyerId: { not: null } },
        _count: true,
      }),
      prisma.caseTask.groupBy({
        by: ["assigneeId"],
        where: { tenantId, done: false, dueAt: { lt: now }, assigneeId: { not: null } },
        _count: true,
      }),
    ]);
    lawyerRows = staff
      .map((u) => {
        const rows = load.filter((l) => l.lawyerId === u.id);
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          byStatus: Object.fromEntries(rows.map((r) => [r.status, r._count])),
          overdueTasks: overdueByAssignee.find((o) => o.assigneeId === u.id)?._count ?? 0,
          total: rows.reduce((a, r) => a + r._count, 0),
        };
      })
      // Los admins solo aparecen si llevan casos
      .filter((r) => r.role === "ABOGADO" || r.total > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }

  const upcomingPanel = (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Próximos plazos</h2>
        <Link href="/tareas" className="text-xs font-medium text-brand-700 hover:underline">
          Ver todos →
        </Link>
      </div>
      <ul className="divide-y">
        {upcoming.length === 0 && (
          <li className="px-4 py-6 text-sm text-slate-400">
            Nada vence en los próximos {UPCOMING_DAYS} días
          </li>
        )}
        {upcoming.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="truncate text-slate-800">{t.title}</div>
              <Link href={`/casos/${t.case.id}`} className="block truncate text-xs text-brand-700 hover:underline">
                {t.case.title}
              </Link>
            </div>
            <div className="shrink-0 text-right">
              <DueBadge state={dueState(t.dueAt, t.done, now.getTime())} />
              <div className="mt-0.5 text-[11px] text-slate-500">{formatDue(t.dueAt)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks(role)} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">
              {isAdmin ? "Panel de la firma" : "Mis expedientes"}
            </h1>
            <p className="text-sm text-slate-500">Resumen al {now.toLocaleDateString("es-EC")}</p>
          </div>
          <Link
            href="/casos/nuevo"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
          >
            + Nuevo caso
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Casos activos" value={activeCases} hint={`${byStatus.cerrado} cerrados`} />
          <StatTile label="Tareas abiertas" value={openTasks} href="/tareas" />
          <StatTile
            label="Tareas vencidas"
            value={overdueTasks}
            tone="critical"
            href="/tareas?f=vencidas"
          />
          <StatTile label="Documentos" value={documents} />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <CasesByStatusChart counts={byStatus} statuses={CASE_STATUSES} />
          {upcomingPanel}
          {isAdmin && (
            <div className="lg:col-span-2">
              <LawyerLoadChart rows={lawyerRows} statuses={ACTIVE_STATUSES} />
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-brand-900">
            Casos <span className="text-sm font-normal text-slate-500">({cases.length})</span>
          </h2>
          {validStatus && (
            <Link
              href={q ? `/dashboard?q=${encodeURIComponent(q)}` : "/dashboard"}
              className="rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
            >
              {CASE_STATUS_LABELS[validStatus]} ✕
            </Link>
          )}
          <form className="ml-auto w-full sm:w-auto">
            {validStatus && <input type="hidden" name="status" value={validStatus} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por título…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-72"
            />
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Caso</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Abogado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No hay casos con estos filtros
                  </td>
                </tr>
              )}
              {cases.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.title}
                    </Link>
                    {c.matterType && (
                      <div className="text-xs text-slate-400">{c.matterType}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.lawyer?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.updatedAt.toLocaleDateString("es-EC")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
