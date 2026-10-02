import { CASE_REQUEST_LABELS, CaseRequestState } from "@bogados/shared";

const COLORS: Record<CaseRequestState, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  aplazada: "bg-sky-100 text-sky-800",
  aceptada: "bg-emerald-100 text-emerald-800",
  rechazada: "bg-red-100 text-red-800",
};

/** Estado de una solicitud del portal (solo se muestra mientras no esté aceptada). */
export function CaseRequestBadge({ state }: { state: CaseRequestState }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[state]}`}>
      {CASE_REQUEST_LABELS[state]}
    </span>
  );
}
