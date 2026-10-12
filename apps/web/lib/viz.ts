import { CaseStatus } from "@bogados/shared";

/**
 * Color por estado en las gráficas, sacado de la paleta (Salvia, Ocre, Pizarra, gris Tinta).
 * Tonos medios: ≥3:1 tanto sobre Marfil como sobre la superficie oscura, así sirven en ambos temas.
 * El color sigue al estado, nunca al ranking: no reasignar si cambia el filtro.
 */
export const STATUS_SERIES_COLOR: Record<CaseStatus, string> = {
  abierto: "#4a7a63",
  intake: "#b8862e",
  en_pausa: "#4f7391",
  cerrado: "#7a746a",
};

/** Tinta legible para etiquetas dentro de cada relleno (≥4.5:1). */
export const STATUS_SERIES_INK: Record<CaseStatus, string> = {
  abierto: "#ffffff",
  intake: "#171511",
  en_pausa: "#ffffff",
  cerrado: "#ffffff",
};
