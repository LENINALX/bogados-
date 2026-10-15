/** Límites de «hoy» y «esta semana» en la zona horaria del bufete, para el panel de inicio. */

export type DayBounds = {
  /** Hoy en la zona del bufete (YYYY-MM-DD). */
  today: string;
  startOfToday: Date;
  startOfTomorrow: Date;
  /** Inicio del lunes siguiente: «esta semana» llega hasta el domingo. */
  endOfWeek: Date;
};

export type DueBucket = "overdue" | "today" | "week" | "later";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Diferencia (ms) entre la hora local de `timeZone` y UTC en el instante `at`. */
function offsetMs(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Medianoche de `ymd` en `timeZone`, como instante UTC. */
export function zonedMidnight(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  // Dos pasadas: la segunda corrige si la medianoche cae al otro lado de un cambio de hora
  const first = guess - offsetMs(new Date(guess), timeZone);
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayBounds(now: Date, timeZone: string): DayBounds {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    now,
  );
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  const daysToNextMonday = weekday === 0 ? 1 : 8 - weekday;
  return {
    today,
    startOfToday: zonedMidnight(today, timeZone),
    startOfTomorrow: zonedMidnight(addDays(today, 1), timeZone),
    endOfWeek: zonedMidnight(addDays(today, daysToNextMonday), timeZone),
  };
}

export function dueBucket(dueAt: Date, now: Date, bounds: DayBounds): DueBucket {
  const t = dueAt.getTime();
  if (t < now.getTime()) return "overdue";
  if (t < bounds.startOfTomorrow.getTime()) return "today";
  if (t < bounds.endOfWeek.getTime()) return "week";
  return "later";
}
