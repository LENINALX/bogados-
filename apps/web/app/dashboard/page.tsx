import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui";
import { Badge, ChipCount, SectionTitle, chipClass, chipRail, th, tr } from "@/components/staff/primitives";
import { ChevronLeft, ChevronRight, FolderOpen, Inbox, Plus, Search, SearchX } from "lucide-react";
import { TodayPanel } from "@/components/TodayPanel";
import { dayBounds } from "@/lib/today";
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
import { recentMonths } from "@/lib/stats";
import { CASES_LIST_ID } from "@/lib/nav";
import { ScrollToHash } from "@/components/ScrollToHash";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus, OPEN_CASE_REQUEST_STATES } from "@bogados/shared";

const ACTIVE_STATUSES = ["intake", "abierto", "en_pausa"] as const satisfies readonly CaseStatus[];
/** Cuántos vencimientos de la semana caben en «Hoy»; el resto, en /tareas. */
const WEEK_TASKS_SHOWN = 8;
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
  // «Hoy» y «esta semana» se cuentan en la hora del bufete, no en la del servidor
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } });
  const timeZone = tenant?.timezone ?? "America/Guayaquil";
  const bounds = dayBounds(now, timeZone);
  const appointmentScope: Prisma.AppointmentWhereInput = isAdmin ? { tenantId } : { tenantId, lawyerId: userId };
  const appointmentInclude = {
    client: { select: { name: true } },
    lawyer: { select: { name: true } },
    case: { select: { id: true, title: true } },
  } as const;
  const taskInclude = {
    case: { select: { id: true, title: true } },
    assignee: { select: { name: true } },
  } as const;

  const [
    casesTotal,
    cases,
    counts,
    openTasks,
    overdueTasks,
    documents,
    todayAppointments,
    weekTasks,
    weekTaskCount,
  ] = await Promise.all([
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
    prisma.appointment.findMany({
      where: {
        ...appointmentScope,
        status: { not: "cancelada" },
        startsAt: { gte: bounds.startOfToday, lt: bounds.startOfTomorrow },
      },
      include: appointmentInclude,
      orderBy: { startsAt: "asc" },
    }),
    // Vencidos y los que vencen hasta el domingo
    prisma.caseTask.findMany({
      where: { ...taskScope, done: false, dueAt: { lt: bounds.endOfWeek } },
      include: taskInclude,
      orderBy: { dueAt: "asc" },
      take: WEEK_TASKS_SHOWN,
    }),
    prisma.caseTask.count({ where: { ...taskScope, done: false, dueAt: { lt: bounds.endOfWeek } } }),
  ]);

  // Si el día o la semana están vacíos, se adelanta lo siguiente para que el panel no quede mudo
  const [nextAppointment, nextTask] = await Promise.all([
    todayAppointments.length === 0
      ? prisma.appointment.findFirst({
          where: { ...appointmentScope, status: { in: ["pendiente", "confirmada"] }, startsAt: { gte: bounds.startOfTomorrow } },
          include: appointmentInclude,
          orderBy: { startsAt: "asc" },
        })
      : null,
    weekTasks.length === 0
      ? prisma.caseTask.findFirst({
          where: { ...taskScope, done: false, dueAt: { gte: bounds.endOfWeek } },
          include: taskInclude,
          orderBy: { dueAt: "asc" },
        })
      : null,
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

  let caseMonthRows: CountChartRow[] = [];
  let caseMatterRows: CountChartRow[] = [];
  let decisionDays: number | null = null;
  let decidedRequestCount = 0;
  let lawyerAppointmentRows: LawyerAppointmentsRow[] = [];

  if (isAdmin) {
    // Los meses se agrupan en la zona horaria del bufete ("createdAt" se guarda en UTC)
    const months = recentMonths(now, timeZone);
    const [monthBuckets, matterBuckets, decidedRequests] = await Promise.all([
      prisma.$queryRaw<Array<{ month: string; total: number }>>`
        SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM') AS month,
               COUNT(*)::int AS total
        FROM "Case"
        WHERE "tenantId" = ${tenantId}
          AND to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}, 'YYYY-MM') >= ${months[0].key}
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

    const monthTotals = new Map(monthBuckets.map((row) => [row.month, row.total]));
    caseMonthRows = months.map(({ key, label }) => ({ label, value: monthTotals.get(key) ?? 0 }));
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

  // Cambiar filtros vuelve a la página 1 (no se pasa `page`).
  // El ancla lleva al listado: está bajo las estadísticas y, sin ella, la página volvería
  // arriba y el filtro parecería no hacer nada.
  const href = (params: { status?: string; q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    const s = sp.toString();
    return `/dashboard${s ? `?${s}` : ""}#${CASES_LIST_ID}`;
  };
  const filtered = Boolean(validStatus || q);

  const totalPages = Math.max(1, Math.ceil(casesTotal / PAGE_SIZE));
  if (page > totalPages) redirect(href({ status: validStatus, q, page: totalPages }));
  const pageHref = (p: number) => href({ status: validStatus, q, page: p });

  return (
    <StaffLayout user={session.user} links={staffLinks(role)}>
      <main className="page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">{isAdmin ? "Panel de la firma" : "Mis expedientes"}</h1>
            <p className="page-subtitle">
              {isAdmin ? "Toda la firma" : "Casos asignados a ti"} · datos al {now.toLocaleDateString("es-EC")}
            </p>
          </div>
          <Link href="/casos/nuevo" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo caso
          </Link>
        </div>

        <TodayPanel
          now={now}
          bounds={bounds}
          timeZone={timeZone}
          appointments={todayAppointments}
          nextAppointment={nextAppointment}
          tasks={weekTasks}
          moreTasks={weekTaskCount - weekTasks.length}
          nextTask={nextTask}
          showLawyer={isAdmin}
        />

        {openRequests.length > 0 && (
          <section id="solicitudes" aria-labelledby="requests-title" className="card mb-10 scroll-mt-6 overflow-hidden">
            <div className="card-header bg-amber-50/60">
              <h2 id="requests-title" className="card-title flex items-center gap-2">
                <Inbox className="h-4 w-4 text-amber-700" aria-hidden />
                Solicitudes de clientes
              </h2>
              <Badge tone="amber">{openRequests.length} por decidir</Badge>
            </div>
            <ul className="divide-y divide-slate-900/[0.06]">
              {openRequests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/casos/${r.id}`}
                    className="group flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-slate-900/[0.02] sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 group-hover:text-brand-700">{r.title}</div>
                      <div className="text-xs tabular-nums text-slate-500">
                        {r.client?.name ?? "—"} · enviada el {r.createdAt.toLocaleDateString("es-EC")}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {r.requestState && <CaseRequestBadge state={r.requestState} />}
                      <ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <StatTile label="Casos activos" value={activeCases} hint={`${byStatus.cerrado} cerrados`} />
          <StatTile label="Tareas abiertas" value={openTasks} href="/tareas" />
          <StatTile label="Tareas vencidas" value={overdueTasks} tone="critical" href="/tareas?f=vencidas" />
          <StatTile label="Documentos" value={documents} hint="En todos los casos" />
        </div>

        {isAdmin && (
          <section aria-labelledby="office-statistics-title" className="mb-10">
            <div className="mb-4">
              <SectionTitle id="office-statistics-title">Estadísticas del despacho</SectionTitle>
              <p className="mt-1 text-sm text-slate-500">
                Casos por mes y materia, decisiones de solicitudes y citas por abogado.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <CasesByMonthChart rows={caseMonthRows} />
              <CasesByMatterChart rows={caseMatterRows} />
              <RequestDecisionTimeChart averageDays={decisionDays} requestCount={decidedRequestCount} />
              <LawyerAppointmentsChart rows={lawyerAppointmentRows} />
            </div>
          </section>
        )}

        <div className="mb-10 grid gap-5 lg:grid-cols-2">
          <div className={isAdmin ? undefined : "lg:col-span-2"}>
            <CasesByStatusChart counts={byStatus} statuses={CASE_STATUSES} />
          </div>
          {isAdmin && <LawyerLoadChart rows={lawyerRows} statuses={ACTIVE_STATUSES} />}
        </div>

        <Suspense>
          <ScrollToHash id={CASES_LIST_ID} />
        </Suspense>
        {/* scroll-mt: deja libre la barra superior fija del móvil */}
        <section id={CASES_LIST_ID} aria-labelledby="cases-title" className="scroll-mt-20 lg:scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <SectionTitle id="cases-title">
              {isAdmin ? "Casos" : "Tus casos"}{" "}
              <span className="font-sans text-base font-normal tabular-nums tracking-normal text-slate-500">
                {casesTotal}
                {validStatus && <> · {CASE_STATUS_LABELS[validStatus]}</>}
                {q && <> · “{q}”</>}
              </span>
            </SectionTitle>
            {filtered && (
              <Link href={href({})} className="text-[13px] font-medium text-brand-700 underline-offset-4 hover:underline">
                Quitar filtros
              </Link>
            )}
          </div>

          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Filtrar por estado" className={`${chipRail} self-start`}>
              <Link href={href({ q })} className={chipClass(!validStatus)} aria-current={!validStatus ? "true" : undefined}>
                Todos <ChipCount active={!validStatus}>{total}</ChipCount>
              </Link>
              {CASE_STATUSES.map((s) => (
                <Link
                  key={s}
                  href={href({ status: s, q })}
                  className={chipClass(validStatus === s)}
                  aria-current={validStatus === s ? "true" : undefined}
                >
                  {CASE_STATUS_LABELS[s]} <ChipCount active={validStatus === s}>{byStatus[s]}</ChipCount>
                </Link>
              ))}
            </nav>

            <form role="search" action={`/dashboard#${CASES_LIST_ID}`} className="flex gap-2 lg:w-[22rem]">
              {validStatus && <input type="hidden" name="status" value={validStatus} />}
              <label htmlFor="q" className="sr-only">
                Buscar casos
              </label>
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Buscar por título o descripción…"
                  className="input pl-9"
                />
              </div>
              <button type="submit" className="btn-secondary">
                Buscar
              </button>
              {q && (
                <Link href={href({ status: validStatus })} className="btn-ghost px-3">
                  Limpiar
                </Link>
              )}
            </form>
          </div>

          <div className="card overflow-hidden">
            {cases.length === 0 ? (
              filtered ? (
                <EmptyState
                  icon={SearchX}
                  title="Ningún caso coincide"
                  hint="Prueba con otra búsqueda o quita el filtro de estado."
                  action={{ href: href({}), label: "Ver todos los casos" }}
                />
              ) : (
                <EmptyState
                  icon={FolderOpen}
                  title="Todavía no hay casos"
                  hint="Crea el primero: podrás vincular su proceso del SATJE y registrar sus términos."
                  action={{ href: "/casos/nuevo", label: "Nuevo caso" }}
                />
              )
            ) : (
              <>
                {/* Móvil: tarjetas */}
                <ul className="divide-y divide-slate-900/[0.06] sm:hidden">
                  {cases.map((c) => (
                    <li key={c.id}>
                      <Link href={`/casos/${c.id}`} className="block px-4 py-3.5 active:bg-slate-900/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-medium text-slate-900">{c.title}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {c.matterType && <>{c.matterType} · </>}
                          {c.client?.name ?? "Sin cliente"}
                          {isAdmin && <> · {c.lawyer?.name ?? "Sin abogado"}</>}
                        </div>
                        <div className="mt-0.5 text-xs tabular-nums text-slate-400">
                          Actualizado el {c.updatedAt.toLocaleDateString("es-EC")}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Escritorio: tabla */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-900/[0.08] bg-slate-900/[0.015]">
                      <tr>
                        <th scope="col" className={th}>Caso</th>
                        <th scope="col" className={th}>Cliente</th>
                        <th scope="col" className={th}>Abogado</th>
                        <th scope="col" className={th}>Estado</th>
                        <th scope="col" className={`${th} text-right`}>Actualizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/[0.06]">
                      {cases.map((c) => (
                        <tr key={c.id} className={`group ${tr}`}>
                          <td className="px-4 py-2.5 sm:px-5">
                            <Link
                              href={`/casos/${c.id}`}
                              className="font-medium text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline"
                            >
                              {c.title}
                            </Link>
                            {c.matterType && <div className="text-xs text-slate-500">{c.matterType}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 sm:px-5">{c.client?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-slate-600 sm:px-5">{c.lawyer?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 sm:px-5">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-500 sm:px-5">
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
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs tabular-nums text-slate-500">
                Página {page} de {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="btn-secondary btn-sm" rel="next">
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      </main>
    </StaffLayout>
  );
}
