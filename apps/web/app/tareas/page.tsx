import Link from "next/link";
import { CalendarCheck, CircleCheck, ListChecks, TriangleAlert, type LucideIcon } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { SOON_MS, dueState, formatDue } from "@/lib/tasks";
import { StaffLayout } from "@/components/StaffLayout";
import { DueBadge } from "@/components/DueBadge";
import { TaskDoneToggle } from "@/components/TaskDoneToggle";
import { EmptyState } from "@/components/ui";
import { chipClass, chipRail, th, tr } from "@/components/staff/primitives";

const FILTERS = {
  pendientes: "Pendientes",
  vencidas: "Vencidas",
  proximas: "Próximos 3 días",
  completadas: "Completadas",
} as const;
type Filter = keyof typeof FILTERS;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { f?: string; scope?: string };
}) {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;

  const filter: Filter = searchParams.f && searchParams.f in FILTERS ? (searchParams.f as Filter) : "pendientes";
  const scopeAll = role === "ADMIN" && searchParams.scope === "firma";
  const now = new Date();

  const base: Prisma.CaseTaskWhereInput = { tenantId };
  if (role === "ABOGADO") {
    base.OR = [{ assigneeId: userId }, { case: { lawyerId: userId } }];
  } else if (!scopeAll) {
    base.assigneeId = userId;
  }

  const filterWhere: Record<Filter, Prisma.CaseTaskWhereInput> = {
    pendientes: { done: false },
    vencidas: { done: false, dueAt: { lt: now } },
    proximas: { done: false, dueAt: { gte: now, lte: new Date(now.getTime() + SOON_MS) } },
    completadas: { done: true },
  };

  const [tasks, overdueCount, soonCount] = await Promise.all([
    prisma.caseTask.findMany({
      where: { ...base, ...filterWhere[filter] },
      include: {
        assignee: { select: { name: true } },
        case: { select: { id: true, title: true } },
      },
      orderBy: filter === "completadas" ? { updatedAt: "desc" } : { dueAt: "asc" },
      take: 200,
    }),
    prisma.caseTask.count({ where: { ...base, ...filterWhere.vencidas } }),
    prisma.caseTask.count({ where: { ...base, ...filterWhere.proximas } }),
  ]);

  const qs = (f: Filter, scope = scopeAll) =>
    `/tareas?f=${f}${scope ? "&scope=firma" : ""}`;

  const empty: Record<Filter, { icon: LucideIcon; title: string; hint: string }> = {
    pendientes: {
      icon: CalendarCheck,
      title: "No tienes plazos pendientes",
      hint: "Los términos que registres en los casos aparecerán aquí, ordenados por vencimiento.",
    },
    vencidas: { icon: CircleCheck, title: "Nada vencido", hint: "Todos tus plazos están al día." },
    proximas: {
      icon: CalendarCheck,
      title: "Nada vence en los próximos 3 días",
      hint: "Revisa «Pendientes» para ver lo que viene después.",
    },
    completadas: {
      icon: ListChecks,
      title: "Aún no hay tareas completadas",
      hint: "Al marcar una tarea como hecha, quedará registrada aquí.",
    },
  };
  const emptyState = empty[filter];

  return (
    <StaffLayout user={session.user} links={staffLinks(role)}>
      <main className="page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Mis plazos</h1>
            <p className="page-subtitle flex flex-wrap items-center gap-x-1.5">
              {overdueCount > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-red-700">
                  <TriangleAlert className="h-4 w-4" aria-hidden />
                  {overdueCount} vencida{overdueCount === 1 ? "" : "s"}
                </span>
              ) : (
                <span>Sin tareas vencidas</span>
              )}
              <span aria-hidden>·</span>
              <span className="tabular-nums">{soonCount} en los próximos 3 días</span>
            </p>
          </div>
          {role === "ADMIN" && (
            <nav aria-label="Alcance" className={chipRail}>
              <Link href={qs(filter, false)} className={chipClass(!scopeAll)} aria-current={!scopeAll ? "true" : undefined}>
                Asignadas a mí
              </Link>
              <Link href={qs(filter, true)} className={chipClass(scopeAll)} aria-current={scopeAll ? "true" : undefined}>
                Toda la firma
              </Link>
            </nav>
          )}
        </div>

        <nav aria-label="Filtrar plazos" className={`${chipRail} mb-4`}>
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link key={f} href={qs(f)} className={chipClass(f === filter)} aria-current={f === filter ? "true" : undefined}>
              {FILTERS[f]}
              {f === "vencidas" && overdueCount > 0 && (
                <span className="rounded-md bg-red-100 px-1.5 text-[11px] font-medium tabular-nums text-red-800">
                  {overdueCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="card overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState icon={emptyState.icon} title={emptyState.title} hint={emptyState.hint} />
          ) : (
            <>
              {/* Móvil: lista */}
              <ul className="divide-y divide-slate-900/[0.06] md:hidden">
                {tasks.map((t) => {
                  const state = dueState(t.dueAt, t.done, now.getTime());
                  return (
                    <li key={t.id} className={`flex gap-3 px-4 py-3 ${state === "overdue" ? "bg-red-50/50" : ""}`}>
                      <div className="pt-0.5">
                        <TaskDoneToggle taskId={t.id} done={t.done} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm ${t.done ? "text-slate-500 line-through" : "font-medium text-slate-900"}`}>
                          {t.title}
                        </div>
                        <Link href={`/casos/${t.case.id}`} className="block truncate text-[13px] text-brand-700 underline-offset-2 hover:underline">
                          {t.case.title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span className={`tabular-nums ${state === "overdue" ? "font-medium text-red-700" : ""}`}>
                            {formatDue(t.dueAt)}
                          </span>
                          <span aria-hidden className="text-slate-300">·</span>
                          <span>{t.assignee?.name ?? "Sin asignar"}</span>
                          <DueBadge state={state} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Escritorio: tabla */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-900/[0.08] bg-slate-900/[0.015]">
                    <tr>
                      <th scope="col" className={`${th} w-12`}>
                        <span className="sr-only">Hecha</span>
                      </th>
                      <th scope="col" className={th}>Tarea</th>
                      <th scope="col" className={th}>Caso</th>
                      <th scope="col" className={th}>Vence</th>
                      <th scope="col" className={th}>Asignada a</th>
                      <th scope="col" className={th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/[0.06]">
                    {tasks.map((t) => {
                      const state = dueState(t.dueAt, t.done, now.getTime());
                      return (
                        <tr key={t.id} className={state === "overdue" ? "bg-red-50/50" : tr}>
                          <td className="px-4 py-3 sm:px-5">
                            <TaskDoneToggle taskId={t.id} done={t.done} />
                          </td>
                          <td className={`px-4 py-3 sm:px-5 ${t.done ? "text-slate-500 line-through" : "font-medium text-slate-900"}`}>
                            {t.title}
                          </td>
                          <td className="px-4 py-3 sm:px-5">
                            <Link href={`/casos/${t.case.id}`} className="text-brand-700 underline-offset-2 hover:underline">
                              {t.case.title}
                            </Link>
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 tabular-nums sm:px-5 ${
                              state === "overdue" ? "font-medium text-red-700" : "text-slate-600"
                            }`}
                          >
                            {formatDue(t.dueAt)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 sm:px-5">{t.assignee?.name ?? "—"}</td>
                          <td className="px-4 py-3 sm:px-5">
                            <DueBadge state={state} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </StaffLayout>
  );
}
