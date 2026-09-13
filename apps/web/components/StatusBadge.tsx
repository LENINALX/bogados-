import { CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";

const colors: Record<CaseStatus, string> = {
  intake: "bg-amber-100 text-amber-800",
  abierto: "bg-emerald-100 text-emerald-800",
  en_pausa: "bg-slate-100 text-slate-700",
  cerrado: "bg-blue-100 text-blue-800",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as CaseStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        colors[s] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {CASE_STATUS_LABELS[s] ?? status}
    </span>
  );
}
