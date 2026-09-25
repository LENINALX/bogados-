import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { dueState, formatDue } from "@/lib/tasks";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DueBadge } from "@/components/DueBadge";
import { EmptyState } from "@/components/ui";
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
  const total = CASE_STATUSES.reduce((a, s) => a + byStatus[s], 0);
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

  const href = (params: { status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    const s = sp.toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(validStatus || q);

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "border-brand-700 bg-brand-700 text-white"
        : "border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-700"
    }`;

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks(role)} />
      <main className="page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">{isAdmin ? "Panel de la firma" : "Mis expedientes"}</h1>
            <p className="page-subtitle">
              Resumen al {now.toLocaleDateString("es-EC")}
              {!isAdmin && " · casos asignados a ti"}
            </p>
          </div>
          <Link href="/casos/nuevo" className="btn-primary">
            + Nuevo caso
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Casos activos" value={activeCases} hint={`${byStatus.cerrado} cerrados`} />
          <StatTile label="Tareas abiertas" value={openTasks} href="/tareas" />
          <StatTile label="Tareas vencidas" value={overdueTasks} tone="critical" href="/tareas?f=vencidas" />
          <StatTile label="Documentos" value={documents} />
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <CasesByStatusChart counts={byStatus} statuses={CASE_STATUSES} />

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Próximos plazos</h2>
              <Link href="/tareas" className="text-xs font-medium text-brand-700 hover:underline">
                Ver todos →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState
                title={`Nada vence en los próximos ${UPCOMING_DAYS} días`}
                hint="Los plazos que se acerquen aparecerán aquí."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm sm:px-5">
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
            )}
          </section>

          {isAdmin && (
            <div className="lg:col-span-2">
              <LawyerLoadChart rows={lawyerRows} statuses={ACTIVE_STATUSES} />
            </div>
          )}
        </div>

        <div className="card mb-6 space-y-4 p-4 sm:p-5">
          <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            <Link href={href({ q })} className={chip(!validStatus)} aria-current={!validStatus ? "true" : undefined}>
              Todos <span className="opacity-70">{total}</span>
            </Link>
            {CASE_STATUSES.map((s) => (
              <Link
                key={s}
                href={href({ status: s, q })}
                className={chip(validStatus === s)}
                aria-current={validStatus === s ? "true" : undefined}
              >
                {CASE_STATUS_LABELS[s]} <span className="opacity-70">{byStatus[s]}</span>
              </Link>
            ))}
          </nav>

          <form role="search" className="flex flex-col gap-2 sm:flex-row">
            {validStatus && <input type="hidden" name="status" value={validStatus} />}
            <label htmlFor="q" className="sr-only">
              Buscar casos
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar por título o descripción…"
              className="input sm:max-w-md"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Buscar
              </button>
              {q && (
                <Link href={href({ status: validStatus })} className="btn-secondary">
                  Limpiar
                </Link>
              )}
            </div>
          </form>
        </div>

        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            {cases.length} caso{cases.length === 1 ? "" : "s"}
            {validStatus && <> · {CASE_STATUS_LABELS[validStatus]}</>}
            {q && <> · “{q}”</>}
          </h2>
          {filtered && (
            <Link href="/dashboard" className="text-xs font-medium text-brand-700 hover:underline">
              Quitar filtros
            </Link>
          )}
        </div>

        <div className="card overflow-hidden">
          {cases.length === 0 ? (
            filtered ? (
              <EmptyState
                title="No hay casos que coincidan con estos filtros"
                hint="Prueba con otra búsqueda o quita el filtro de estado."
                action={{ href: "/dashboard", label: "Ver todos los casos" }}
              />
            ) : (
              <EmptyState
                title="Todavía no hay casos"
                hint="Crea el primero con el botón «Nuevo caso»."
                action={{ href: "/casos/nuevo", label: "+ Nuevo caso" }}
              />
            )
          ) : (
            <>
              {/* Móvil: tarjetas */}
              <ul className="divide-y divide-slate-100 sm:hidden">
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link href={`/casos/${c.id}`} className="block px-4 py-3 active:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-brand-700">{c.title}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {c.matterType && <>{c.matterType} · </>}
                        Cliente: {c.client?.name ?? "—"}
                        {isAdmin && <> · Abogado: {c.lawyer?.name ?? "—"}</>}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Actualizado {c.updatedAt.toLocaleDateString("es-EC")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Escritorio: tabla */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Caso</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Cliente</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Abogado</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr key={c.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">
                            {c.title}
                          </Link>
                          {c.matterType && <div className="text-xs text-slate-400">{c.matterType}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{c.client?.name ?? "—"}</td>
                        <td className="px-5 py-3.5 text-slate-600">{c.lawyer?.name ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                          {c.updatedAt.toLocaleDateString("es-EC")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
