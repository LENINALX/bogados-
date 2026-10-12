/**
 * Utilidades de las estadísticas del despacho.
 * Los meses se cuentan en la zona horaria del bufete, no en UTC: un caso creado el día 31
 * a las 20:00 en Guayaquil pertenece a ese mes aunque en UTC ya sea el día 1 del siguiente.
 */

export type MonthSlot = { key: string; label: string };

/** Los últimos `count` meses (el actual incluido), del más antiguo al más reciente. key = "YYYY-MM". */
export function recentMonths(now: Date, timeZone: string, count = 12): MonthSlot[] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value); // 1–12
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return {
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-EC", { month: "short", timeZone: "UTC" }).replace(".", ""),
    };
  });
}

/**
 * Duración legible para un promedio en días. Por debajo de un día se muestra en horas,
 * para que una decisión tomada en 3 horas no aparezca como «0 días».
 */
export function formatAverageDuration(days: number): { value: string; unit: string } {
  const fmt = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });
  if (days >= 1) return { value: fmt.format(days), unit: days < 1.05 ? "día" : "días" };
  const hours = days * 24;
  if (hours < 1) return { value: "< 1", unit: "hora" };
  return { value: fmt.format(hours), unit: hours < 1.05 ? "hora" : "horas" };
}
