import { CASE_REQUEST_LABELS, CaseRequestState } from "@bogados/shared";
import { StateBadge } from "./portal/StateBadge";
import type { Tone } from "./portal/case-state";

const TONES: Record<CaseRequestState, Tone> = {
  pendiente: "amber",
  aplazada: "sky",
  aceptada: "emerald",
  rechazada: "red",
};

/** Estado de una solicitud del portal (solo se muestra mientras no esté aceptada). */
export function CaseRequestBadge({ state }: { state: CaseRequestState }) {
  return <StateBadge tone={TONES[state]}>{CASE_REQUEST_LABELS[state]}</StateBadge>;
}
