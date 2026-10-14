/** Respuesta de GET /terms/deadline: vencimiento y desglose del cálculo. */
export type TermDeadline = {
  notifiedOn: string;
  days: number;
  dueOn: string;
  dueAt: string;
  counted: string[];
  skipped: { date: string; reason: string }[];
  timeZone: string;
};

export const MAX_TERM_DAYS = 90;

/** Fecha de hoy (YYYY-MM-DD) en la hora local del navegador. */
export function todayYmd(now = new Date()): string {
  return now.toLocaleDateString("en-CA");
}

// Mediodía UTC: el día no cambia al formatear en ninguna zona horaria
const atNoon = (ymd: string) => new Date(`${ymd}T12:00:00Z`);

/** «miércoles 14 de octubre de 2026» */
export function formatYmdLong(ymd: string): string {
  return atNoon(ymd).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** «sáb 10 oct» */
export function formatYmdShort(ymd: string): string {
  return atNoon(ymd)
    .toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(/\./g, "")
    .replace(",", "");
}

/** Resumen de los días saltados, agrupando fines de semana: «2 días de fin de semana y 1 feriado» */
export function summarizeSkipped(skipped: TermDeadline["skipped"]): string {
  const weekend = skipped.filter((s) => s.reason === "Sábado" || s.reason === "Domingo").length;
  const holidays = skipped.length - weekend;
  const parts = [];
  if (weekend) parts.push(`${weekend} ${weekend === 1 ? "día" : "días"} de fin de semana`);
  if (holidays) parts.push(`${holidays} ${holidays === 1 ? "feriado" : "feriados"}`);
  return parts.length ? `Se saltaron ${parts.join(" y ")}.` : "No hubo días no hábiles por medio.";
}
