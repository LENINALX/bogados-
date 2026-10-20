import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarClock, CalendarDays, Scale, TriangleAlert } from "lucide-react";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus } from "@bogados/shared";
import { formatDay, formatShortDay, formatTime } from "@/lib/appointments";
import { DayBounds, DueBucket, dueBucket } from "@/lib/today";
import { EmptyState } from "./ui";
import { APPOINTMENT_TONE, Badge, HeaderLink, SectionTitle } from "./staff/primitives";

export type TodayAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  reason: string | null;
  client: { name: string };
  lawyer: { name: string };
  case: { id: string; title: string } | null;
};

export type TodayTask = {
  id: string;
  title: string;
  dueAt: Date;
  termDays: number | null;
  case: { id: string; title: string };
  assignee: { name: string } | null;
};

const BUCKETS: { key: Exclude<DueBucket, "later">; label: string; tone: string; dot: string }[] = [
  { key: "overdue", label: "Vencidos", tone: "text-red-700", dot: "bg-red-600" },
  { key: "today", label: "Vencen hoy", tone: "text-amber-800", dot: "bg-amber-500" },
  { key: "week", label: "Resto de la semana", tone: "text-slate-600", dot: "bg-slate-400" },
];

/**
 * Lo primero que se ve al entrar: las citas del día y los términos que vencen
 * hoy y esta semana (es lo que pidieron los abogados en la encuesta).
 */
export function TodayPanel({
  now,
  bounds,
  timeZone,
  appointments,
  nextAppointment,
  tasks,
  moreTasks,
  nextTask,
  showLawyer,
}: {
  now: Date;
  bounds: DayBounds;
  timeZone: string;
  appointments: TodayAppointment[];
  /** Si hoy no hay citas: la siguiente. */
  nextAppointment: TodayAppointment | null;
  /** Pendientes con vencimiento hasta el domingo, incluidos los vencidos. */
  tasks: TodayTask[];
  /** Cuántas más hay en ese rango y no caben en la lista. */
  moreTasks: number;
  /** Si no vence nada esta semana: el siguiente vencimiento. */
  nextTask: TodayTask | null;
  /** El admin ve las citas de toda la firma: se indica de qué abogado es cada una. */
  showLawyer: boolean;
}) {
  const time = (d: Date) => formatTime(d.toISOString(), timeZone);
  const day = (d: Date) => formatDay(d.toISOString(), timeZone);
  const shortDay = (d: Date) => formatShortDay(d.toISOString(), timeZone);
  const dueLabel = (t: TodayTask, bucket: DueBucket) =>
    bucket === "today" ? `hoy, ${time(t.dueAt)}` : `${shortDay(t.dueAt)}, ${time(t.dueAt)}`;

  const grouped = BUCKETS.map((b) => ({ ...b, items: tasks.filter((t) => dueBucket(t.dueAt, now, bounds) === b.key) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <section aria-labelledby="today-title" className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <SectionTitle id="today-title">Hoy</SectionTitle>
        <span className="text-sm text-slate-500">{day(now)}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex min-w-0 flex-col">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden />
              Citas de hoy
              {appointments.length > 0 && (
                <span className="text-[13px] font-normal tabular-nums text-slate-400">{appointments.length}</span>
              )}
            </h3>
            <HeaderLink href="/agenda">Ver agenda</HeaderLink>
          </div>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No hay citas hoy"
              hint={
                nextAppointment
                  ? `La próxima: ${day(nextAppointment.startsAt)}, ${time(nextAppointment.startsAt)}, con ${nextAppointment.client.name}.`
                  : "Las citas que confirmes aparecerán aquí."
              }
            />
          ) : (
            <ul className="divide-y divide-slate-900/[0.06]">
              {appointments.map((a) => {
                const past = a.endsAt.getTime() < now.getTime();
                return (
                  <li
                    key={a.id}
                    className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-sm sm:px-5 ${
                      past ? "opacity-55" : ""
                    }`}
                  >
                    <span className="pt-px font-semibold tabular-nums text-slate-900">{time(a.startsAt)}</span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{a.client.name}</div>
                      <div className="truncate text-[13px] text-slate-500">
                        {a.case ? (
                          <Link href={`/casos/${a.case.id}`} className="text-brand-700 underline-offset-2 hover:underline">
                            {a.case.title}
                          </Link>
                        ) : (
                          (a.reason ?? "Sin caso asociado")
                        )}
                        {showLawyer && <> · {a.lawyer.name}</>}
                      </div>
                    </div>
                    <Badge tone={APPOINTMENT_TONE[a.status]} className={a.status === "cancelada" ? "line-through" : ""}>
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card flex min-w-0 flex-col">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Scale className="h-4 w-4 text-slate-500" aria-hidden />
              Vencimientos de la semana
            </h3>
            <HeaderLink href="/tareas">Ver todos</HeaderLink>
          </div>
          {grouped.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="Nada vence esta semana"
              hint={
                nextTask
                  ? `El siguiente: «${nextTask.title}», ${day(nextTask.dueAt)}.`
                  : "Los términos que registres en los casos aparecerán aquí."
              }
            />
          ) : (
            <div className="divide-y divide-slate-900/[0.06]">
              {grouped.map((g) => (
                <div key={g.key} className="py-2">
                  <p className={`flex items-center gap-2 px-4 pb-1 pt-1.5 text-xs font-medium sm:px-5 ${g.tone}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${g.dot}`} aria-hidden />
                    {g.label}
                    <span className="tabular-nums text-slate-400">{g.items.length}</span>
                  </p>
                  <ul>
                    {g.items.map((t) => (
                      <li key={t.id} className="flex items-start justify-between gap-4 px-4 py-2 text-sm sm:px-5">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{t.title}</div>
                          <Link
                            href={`/casos/${t.case.id}`}
                            className="block truncate text-[13px] text-brand-700 underline-offset-2 hover:underline"
                          >
                            {t.case.title}
                          </Link>
                          {(t.termDays || (showLawyer && t.assignee)) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {t.termDays && (
                                <Badge tone="brand" icon={Scale}>
                                  Término de {t.termDays} {t.termDays === 1 ? "día hábil" : "días hábiles"}
                                </Badge>
                              )}
                              {showLawyer && t.assignee && <span>{t.assignee.name}</span>}
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex shrink-0 items-center gap-1 pt-px text-right text-xs font-medium tabular-nums ${
                            g.key === "overdue" ? "text-red-700" : g.key === "today" ? "text-amber-800" : "text-slate-600"
                          }`}
                        >
                          {g.key === "overdue" && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
                          {dueLabel(t, g.key)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {moreTasks > 0 && (
                <Link
                  href="/tareas"
                  className="group flex items-center justify-center gap-1 px-4 py-2.5 text-[13px] font-medium text-brand-700 transition-colors hover:bg-slate-900/[0.02] sm:px-5"
                >
                  Y {moreTasks} más esta semana
                  <ArrowRight className="cta-arrow h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
