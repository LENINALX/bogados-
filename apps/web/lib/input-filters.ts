/**
 * Filtros de escritura para campos con formato fijo: lo que nunca puede ir en ese campo no
 * llega a entrar (ni tecleado ni pegado). Los campos de texto libre (nombres, títulos, notas)
 * NO se filtran: en español llevan tildes, ñ y comas.
 */
export type InputFilter = (value: string) => string;

const stripAccents = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const filters = {
  /** Email: fuera espacios y separadores de listas (comas, punto y coma) y caracteres de comillas o agrupación */
  email: ((v) => v.replace(/[\s,;:"'<>()[\]\\]/g, "")) as InputFilter,
  /** Código de firma: minúsculas sin tildes; espacios y guiones bajos pasan a guion */
  firmSlug: ((v) =>
    stripAccents(v)
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")) as InputFilter,
  /** Número de proceso del SATJE: dígitos, guiones y la letra final en mayúscula */
  processNumber: ((v) => stripAccents(v).toUpperCase().replace(/[^0-9A-Z-]/g, "")) as InputFilter,
  /** Solo dígitos (días hábiles, código de verificación) */
  digits: ((v) => v.replace(/\D/g, "")) as InputFilter,
};

/**
 * Aplica el filtro al valor del campo en su evento de cambio, sirva el campo controlado o no
 * (lee de FormData), y deja el cursor donde estaba. Devuelve el valor ya filtrado.
 */
export function applyFilter(el: HTMLInputElement | HTMLTextAreaElement, filter: InputFilter): string {
  const raw = el.value;
  const next = filter(raw);
  if (next !== raw) {
    const caret = filter(raw.slice(0, el.selectionStart ?? raw.length)).length;
    el.value = next;
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      // type="email" no admite selección: el valor ya está corregido
    }
  }
  return next;
}
