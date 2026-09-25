export type DueState = "done" | "overdue" | "soon" | "ok";

/** Plazo "próximo" = vence en los próximos 3 días. */
export const SOON_MS = 3 * 24 * 60 * 60 * 1000;

export function dueState(dueAt: string | Date, done: boolean, now = Date.now()): DueState {
  if (done) return "done";
  const t = new Date(dueAt).getTime();
  if (t < now) return "overdue";
  if (t - now <= SOON_MS) return "soon";
  return "ok";
}

export const DUE_STYLES: Record<DueState, { label: string; badge: string; row: string }> = {
  overdue: {
    label: "Vencida",
    badge: "bg-red-100 text-red-800",
    row: "border-l-4 border-l-red-500 bg-red-50/50",
  },
  soon: {
    label: "Próxima",
    badge: "bg-amber-100 text-amber-800",
    row: "border-l-4 border-l-amber-400",
  },
  ok: { label: "En plazo", badge: "bg-slate-100 text-slate-700", row: "border-l-4 border-l-transparent" },
  done: {
    label: "Completada",
    badge: "bg-emerald-100 text-emerald-800",
    row: "border-l-4 border-l-transparent opacity-60",
  },
};

export function formatDue(dueAt: string | Date) {
  return new Date(dueAt).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
