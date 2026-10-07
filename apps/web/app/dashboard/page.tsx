import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { dueState, formatDue } from "@/lib/tasks";
import { StaffLayout } from "@/components/StaffLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { DueBadge } from "@/components/DueBadge";
import { EmptyState } from "@/components/ui";
import { CaseRequestBadge } from "@/components/CaseRequestBadge";
import {
  CasesByStatusChart,
  CasesByMatterChart,
  CasesByMonthChart,
  LawyerAppointmentsChart,
  LawyerLoadChart,
  LawyerAppointmentsRow,
  LawyerLoadRow,
  CountChartRow,
  RequestDecisionTimeChart,
  StatTile,
} from "@/components/DashboardCharts";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus, OPEN_CASE_REQUEST_STATES } from "@bogados/shared";

const ACTIVE_STATUSES = ["intake", "abierto", "en_pausa"] as const satisfies readonly CaseStatus[];
const UPCOMING_DAYS = 7;
const PAGE_SIZE = 20;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;
  const isAdmin = role === "ADMIN";

  const status = searchParams.status as CaseStatus | undefined;
  const validStatus = status && CASE_STATUSES.includes(status) ? status : undefined;
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "", 10) || 1);

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

  const [casesTotal, cases, counts, openTasks, overdueTasks, documents, upcoming] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      include: {
        client: { select: { name: true } },
        lawyer: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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

  // Solicitudes del portal sin decidir: solo el admin las decide (aún no tienen abogado)
  const openRequests = isAdmin
    ? await prisma.case.findMany({
        where: { tenantId, requestState: { in: [...OPEN_CASE_REQUEST_STATES] } },
        select: { id: true, title: true, requestState: true, createdAt: true, client: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
        take: 20,
      })
    : [];

  const analyticsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  let caseMonthRows: CountChartRow[] = [];
  let caseMatterRows: CountChartRow[] = [];
  let decisionDays: number | null = null;
  let decidedRequestCount = 0;
  let lawyerAppointmentRows: LawyerAppointmentsRow[] = [];

  if (isAdmin) {
    const [monthBuckets, matterBuckets, decidedRequests] = await Promise.all([
      prisma.$queryRaw<Array<{ month: Date; total: number }>>`
        SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::int AS total
        FROM "Case"
        WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${analyticsStart} AND "createdAt" <= ${now}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.case.groupBy({
        by: ["matterType"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.case.findMany({
        where: {
          tenantId,
          requestState: { in: ["aceptada", "rechazada"] },
          decidedAt: { not: null },
        },
        select: { createdAt: true, decidedAt: true },
      }),
    ]);

    const monthTotals = new Map(monthBuckets.map((row) => [row.month.toISOString().slice(0, 7), row.total]));
    caseMonthRows = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: date.toLocaleDateString("es-EC", { month: "short" }).replace(".", ""),
        value: monthTotals.get(key) ?? 0,
      };
    });
    caseMatterRows = matterBuckets
      .map((row) => ({ label: row.matterType ?? "Sin especificar", value: row._count._all }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    decidedRequestCount = decidedRequests.length;
    if (decidedRequestCount > 0) {
      const elapsed = decidedRequests.reduce(
        (sum, request) => sum + (request.decidedAt!.getTime() - request.createdAt.getTime()),
        0,
      );
      decisionDays = elapsed / decidedRequestCount / (24 * 60 * 60 * 1000);
    }
  }

  let lawyerRows: LawyerLoadRow[] = [];
  if (isAdmin) {
    const [staff, load, overdueByAssignee, appointmentGroups, appointmentLawyers] = await Promise.all([
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
      prisma.appointment.groupBy({
        by: ["lawyerId", "status"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: {
          tenantId,
          role: "ABOGADO",
          OR: [
            { active: true },
            { appointmentsAsLawyer: { some: { tenantId } } },
          ],
        },
        select: { id: true, name: true },
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

    const appointmentsByLawyer = new Map<string, Partial<Record<"pendiente" | "confirmada" | "completada" | "cancelada", number>>>();
    for (const row of appointmentGroups) {
      const counts = appointmentsByLawyer.get(row.lawyerId) ?? {};
      counts[row.status] = row._count._all;
      appointmentsByLawyer.set(row.lawyerId, counts);
    }
    lawyerAppointmentRows = appointmentLawyers
      .map((lawyer) => ({ id: lawyer.id, name: lawyer.name, byStatus: appointmentsByLawyer.get(lawyer.id) ?? {} }))
      .sort((a, b) =>
        Object.values(b.byStatus).reduce((sum, count) => sum + (count ?? 0), 0) -
          Object.values(a.byStatus).reduce((sum, count) => sum + (count ?? 0), 0) ||
        a.name.localeCompare(b.name),
      );
  }

  // Cambiar filtros vuelve a la página 1 (no se pasa `page`)
  const href = (params: { status?: string; q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    const s = sp.toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(validStatus || q);

  const totalPages = Math.max(1, Math.ceil(casesTotal / PAGE_SIZE));
  if (page > totalPages) redirect(href({ status: validStatus, q, page: totalPages }));
  const pageHref = (p: number) => href({ status: validStatus, q, page: p });

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "border-brand-600 bg-brand-600 text-white"
        : "border-slate-200 bg-surface text-slate-700 hover:border-brand-500 hover:text-brand-700"
    }`;

  return (
    <StaffLayout user={session.user} links={staffLinks(role)}>
      <main className="page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title sm:text-3xl">{isAdmin ? "Panel de la firma" : "Mis expedientes"}</h1>
            <p className="page-subtitle">
              Resumen al {now.toLocaleDateString("es-EC")}
              {!isAdmin && " · casos asignados a ti"}
            </p>
          </div>
          <Link href="/casos/nuevo" className="btn-primary">
            + Nuevo caso
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Casos activos" value={activeCases} hint={`${byStatus.cerrado} cerrados`} />
          <StatTile label="Tareas abiertas" value={openTasks} href="/tareas" />
          <StatTile label="Tareas vencidas" value={overdueTasks} tone="critical" href="/tareas?f=vencidas" />
          <StatTile label="Documentos" value={documents} />
        </div>

        {isAdmin && (
          <section aria-labelledby="office-statistics-title" className="mb-10">
            <div className="mb-4">
              <h2 id="office-statistics-title" className="text-lg font-semibold text-slate-900">
                Estadísticas del despacho
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Casos por mes y materia, decisiones de solicitudes y citas por abogado.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CasesByMonthChart rows={caseMonthRows} />
              <CasesByMatterChart rows={caseMatterRows} />
              <RequestDecisionTimeChart averageDays={decisionDays} requestCount={decidedRequestCount} />
              <LawyerAppointmentsChart rows={lawyerAppointmentRows} />
            </div>
          </section>
        )}

        {openRequests.length > 0 && (
          <section className="card mb-8 rounded-2xl border-amber-200">
            <div className="card-header py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">Solicitudes de clientes</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {openRequests.length} por decidir
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {openRequests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/casos/${r.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50 sm:px-6"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-brand-700">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {r.client?.name ?? "—"} · {r.createdAt.toLocaleDateString("es-EC")}
                      </div>
                    </div>
                    {r.requestState && <CaseRequestBadge state={r.requestState} />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <CasesByStatusChart counts={byStatus} statuses={CASE_STATUSES} />

          <section className="card rounded-2xl">
            <div className="card-header py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">Próximos plazos</h2>
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
                  <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm sm:px-6">
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

        <div className="card mb-8 space-y-4 rounded-2xl p-4 sm:p-6">
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

        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            {casesTotal} caso{casesTotal === 1 ? "" : "s"}
            {validStatus && <> · {CASE_STATUS_LABELS[validStatus]}</>}
            {q && <> · “{q}”</>}
          </h2>
          {filtered && (
            <Link href="/dashboard" className="text-xs font-medium text-brand-700 hover:underline">
              Quitar filtros
            </Link>
          )}
        </div>

        <div className="card overflow-hidden rounded-2xl">
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

        {totalPages > 1 && (
          <nav aria-label="Paginación de casos" className="mt-4 flex items-center justify-between gap-3 text-sm">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="btn-secondary btn-sm" rel="prev">
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-slate-500">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="btn-secondary btn-sm" rel="next">
                Siguiente →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>
    </StaffLayout>
  );
}
