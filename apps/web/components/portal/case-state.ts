import { CASE_REQUEST_LABELS, CASE_STATUS_LABELS, CaseRequestState, CaseStatus } from "@bogados/shared";

/** Tono semántico de una insignia: fondo tintado suave + texto del mismo color */
export type Tone = "brand" | "emerald" | "amber" | "sky" | "red" | "slate";

export const TONE_BADGE: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-800",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  sky: "bg-sky-100 text-sky-800",
  red: "bg-red-100 text-red-800",
  slate: "bg-slate-100 text-slate-700",
};

/** Color del punto que acompaña a la insignia */
export const TONE_DOT: Record<Tone, string> = {
  brand: "bg-brand-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  sky: "bg-sky-600",
  red: "bg-red-600",
  slate: "bg-slate-400",
};

type StateCopy = { label: string; tone: Tone; /** Qué significa, en palabras del cliente */ meaning: string };

const STATUS: Record<CaseStatus, Omit<StateCopy, "label">> = {
  intake: { tone: "amber", meaning: "Tu abogado está reuniendo la información para empezar." },
  abierto: { tone: "emerald", meaning: "Tu abogado está trabajando en él." },
  en_pausa: { tone: "slate", meaning: "Sin movimiento por ahora. Te avisaremos cuando avance." },
  cerrado: { tone: "sky", meaning: "El asunto ha terminado. Puedes seguir consultándolo." },
};

const REQUEST: Record<Exclude<CaseRequestState, "aceptada">, Omit<StateCopy, "label">> = {
  pendiente: { tone: "amber", meaning: "El despacho está revisando tu solicitud." },
  aplazada: { tone: "sky", meaning: "La decisión se ha aplazado. No está rechazada." },
  rechazada: { tone: "red", meaning: "El despacho no puede asumir este asunto." },
};

/**
 * Estado que ve el cliente: mientras la solicitud no esté aceptada, manda el de la solicitud;
 * después, el del caso.
 */
export function clientCaseState(status: string, request: CaseRequestState | null): StateCopy {
  if (request && request !== "aceptada") {
    return { label: CASE_REQUEST_LABELS[request], ...REQUEST[request] };
  }
  const s = status as CaseStatus;
  if (STATUS[s]) return { label: CASE_STATUS_LABELS[s], ...STATUS[s] };
  return { label: status, tone: "slate", meaning: "" };
}
