import Link from "next/link";
import { CalendarClock, Scale } from "lucide-react";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus } from "@bogados/shared";
import { formatDay, formatShortDay, formatTime, STATUS_BADGE } from "@/lib/appointments";
import { DayBounds, DueBucket, dueBucket } from "@/lib/today";

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

const BUCKETS: { key: Exclude<DueBucket, "later">; label: string; tone: string }[] = [
  { key: "overdue", label: "Vencidos", tone: "text-red-700" },
  { key: "today", label: "Vencen hoy", tone: "text-amber-800" },
  { key: "week", label: "Resto de la semana", tone: "text-slate-600" },
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
    <section aria-labelledby="today-title" className="mb-8">
      <h2 id="today-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Hoy · {day(now)}
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card min-w-0 rounded-2xl">
          <div className="card-header py-4 sm:px-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <CalendarClock className="h-4 w-4 text-brand-700" aria-hidden />
              Citas de hoy
              {appointments.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {appointments.length}
                </span>
              )}
            </h3>
            <Link href="/agenda" className="shrink-0 whitespace-nowrap text-xs font-medium text-brand-700 hover:underline">
              Ver agenda →
            </Link>
          </div>
          {appointments.length === 0 ? (
            <div className="px-4 py-8 text-center sm:px-6">
              <p className="text-sm font-medium text-slate-600">No hay citas hoy</p>
              <p className="mt-1 text-xs text-slate-400">
                {nextAppointment
                  ? `La próxima: ${day(nextAppointment.startsAt)}, ${time(nextAppointment.startsAt)} con ${nextAppointment.client.name}`
                  : "Las citas que confirmes aparecerán aquí."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appointments.map((a) => {
                const past = a.endsAt.getTime() < now.getTime();
                return (
                  <li key={a.id} className={`flex gap-4 px-4 py-3 text-sm sm:px-6 ${past ? "opacity-60" : ""}`}>
                    <div className="w-12 shrink-0 font-semibold tabular-nums text-slate-900">{time(a.startsAt)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">{a.client.name}</div>
                      <div className="truncate text-xs text-slate-500">
                        {a.case ? (
                          <Link href={`/casos/${a.case.id}`} className="text-brand-700 hover:underline">
                            {a.case.title}
                          </Link>
                        ) : (
                          (a.reason ?? "Sin caso asociado")
                        )}
                        {showLawyer && <> · {a.lawyer.name}</>}
                      </div>
                    </div>
                    <span
                      className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[a.status]}`}
                    >
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card min-w-0 rounded-2xl">
          <div className="card-header py-4 sm:px-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-brand-700" aria-hidden />
              Vencimientos de la semana
            </h3>
            <Link href="/tareas" className="shrink-0 whitespace-nowrap text-xs font-medium text-brand-700 hover:underline">
              Ver todos →
            </Link>
          </div>
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center sm:px-6">
              <p className="text-sm font-medium text-slate-600">Nada vence esta semana</p>
              <p className="mt-1 text-xs text-slate-400">
                {nextTask
                  ? `El siguiente: «${nextTask.title}», ${day(nextTask.dueAt)}`
                  : "Los términos que registres en los casos aparecerán aquí."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map((g) => (
                <div key={g.key} className="py-2">
                  <p className={`px-4 pt-1 text-[11px] font-semibold uppercase tracking-wide sm:px-6 ${g.tone}`}>
                    {g.label} · {g.items.length}
                  </p>
                  <ul>
                    {g.items.map((t) => (
                      <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-2 text-sm sm:px-6">
                        <div className="min-w-0">
                          <div className="truncate text-slate-800">{t.title}</div>
                          <Link
                            href={`/casos/${t.case.id}`}
                            className="block truncate text-xs text-brand-700 hover:underline"
                          >
                            {t.case.title}
                          </Link>
                          {(t.termDays || (showLawyer && t.assignee)) && (
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {t.termDays && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700">
                                  <Scale className="h-3 w-3" aria-hidden />
                                  Término de {t.termDays} {t.termDays === 1 ? "día hábil" : "días hábiles"}
                                </span>
                              )}
                              {showLawyer && t.assignee && <span>{t.assignee.name}</span>}
                            </div>
                          )}
                        </div>
                        <div
                          className={`shrink-0 text-right text-xs font-medium ${
                            g.key === "overdue" ? "text-red-700" : g.key === "today" ? "text-amber-800" : "text-slate-600"
                          }`}
                        >
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
                  className="block px-4 py-2.5 text-center text-xs font-medium text-brand-700 hover:bg-slate-50 sm:px-6"
                >
                  Y {moreTasks} más esta semana →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
