import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { DUE_STYLES, SOON_MS, dueState, formatDue } from "@/lib/tasks";
import { AppHeader } from "@/components/AppHeader";
import { DueBadge } from "@/components/DueBadge";
import { TaskDoneToggle } from "@/components/TaskDoneToggle";

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

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks(role)} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Mis plazos</h1>
            <p className="text-sm text-slate-500">
              {overdueCount > 0 ? (
                <span className="font-semibold text-red-700">
                  {overdueCount} vencida{overdueCount === 1 ? "" : "s"}
                </span>
              ) : (
                "Sin tareas vencidas"
              )}
              {" · "}
              {soonCount} en los próximos 3 días
            </p>
          </div>
          {role === "ADMIN" && (
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
              <Link
                href={qs(filter, false)}
                className={`rounded-md px-3 py-1.5 ${!scopeAll ? "bg-brand-700 text-white" : "text-slate-600"}`}
              >
                Asignadas a mí
              </Link>
              <Link
                href={qs(filter, true)}
                className={`rounded-md px-3 py-1.5 ${scopeAll ? "bg-brand-700 text-white" : "text-slate-600"}`}
              >
                Toda la firma
              </Link>
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={qs(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                f === filter
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-500"
              }`}
            >
              {FILTERS[f]}
              {f === "vencidas" && overdueCount > 0 && ` (${overdueCount})`}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Caso</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3">Asignada a</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No hay tareas en esta vista
                  </td>
                </tr>
              )}
              {tasks.map((t) => {
                const state = dueState(t.dueAt, t.done, now.getTime());
                return (
                  <tr key={t.id} className={`border-b last:border-0 ${DUE_STYLES[state].row}`}>
                    <td className="px-4 py-3">
                      <TaskDoneToggle taskId={t.id} done={t.done} />
                    </td>
                    <td className={`px-4 py-3 ${t.done ? "text-slate-500 line-through" : "text-slate-800"}`}>
                      {t.title}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/casos/${t.case.id}`} className="text-brand-700 hover:underline">
                        {t.case.title}
                      </Link>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 ${state === "overdue" ? "font-semibold text-red-700" : "text-slate-600"}`}>
                      {formatDue(t.dueAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.assignee?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <DueBadge state={state} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
