import { CaseStatus } from "@bogados/shared";

/**
 * Color por estado en las gráficas (paleta categórica validada, slots 1–4 en orden fijo).
 * El color sigue al estado, nunca al ranking: no reasignar si cambia el filtro.
 */
export const STATUS_SERIES_COLOR: Record<CaseStatus, string> = {
  abierto: "#2a78d6",
  intake: "#eb6834",
  en_pausa: "#1baf7a",
  cerrado: "#eda100",
};

/** Tinta legible para etiquetas dentro de cada relleno (≥4.5:1). */
export const STATUS_SERIES_INK: Record<CaseStatus, string> = {
  abierto: "#ffffff",
  intake: "#0b0b0b",
  en_pausa: "#0b0b0b",
  cerrado: "#0b0b0b",
};
