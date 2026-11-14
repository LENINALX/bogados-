/** Exportaciones a Excel y PDF (GET /exports/* de la API). */

export type ExportFormat = "xlsx" | "pdf";
export type ExportResource = "cases" | "clients";

const FILE_BASE: Record<ExportResource, string> = { cases: "casos", clients: "clientes" };

/** Ruta de la API con los filtros de la vista; los vacíos no se envían (la API los rechazaría). */
export function exportPath(
  resource: ExportResource,
  format: ExportFormat,
  filters: Record<string, string | undefined> = {},
): string {
  const qs = new URLSearchParams({ format });
  for (const [key, value] of Object.entries(filters)) {
    const v = value?.trim();
    if (v) qs.set(key, v);
  }
  return `/exports/${resource}?${qs}`;
}

/** «casos-2026-11-12.xlsx», con la fecha del equipo de quien descarga. */
export function exportFileName(resource: ExportResource, format: ExportFormat, now = new Date()): string {
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `${FILE_BASE[resource]}-${ymd}.${format}`;
}
