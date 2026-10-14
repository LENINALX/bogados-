/**
 * Número de proceso del SATJE: judicatura (5 dígitos) - año (4) - secuencial (5), con una
 * letra final opcional. La API valida lo mismo (apps/api/src/cases/dto/case.dto.ts).
 */
export const PROCESS_NUMBER = /^\d{5}-\d{4}-\d{5}[A-Z]?$/;
export const PROCESS_NUMBER_EXAMPLE = "13284-2024-00123";

/** Consulta pública de procesos de la Función Judicial (e-SATJE) */
export const SATJE_URL = "https://procesosjudiciales.funcionjudicial.gob.ec/";

/** Quita espacios y pasa a mayúsculas; vacío → null (desvincular). */
export function normalizeProcessNumber(value: string): string | null {
  const clean = value.replace(/\s+/g, "").toUpperCase();
  return clean === "" ? null : clean;
}

export function isValidProcessNumber(value: string): boolean {
  return PROCESS_NUMBER.test(value);
}
