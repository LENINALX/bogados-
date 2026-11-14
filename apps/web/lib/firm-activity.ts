/**
 * Admin › Actividad: quién hizo qué y cuándo en toda la firma (GET /activity de la API).
 * Los grupos son los mismos que en apps/api/src/activity/activity.service.ts (ACTIVITY_CATEGORIES).
 */

export type ActivityCategory = "casos" | "documentos" | "notas" | "mensajes" | "citas" | "usuarios" | "ajustes";

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  casos: "Casos",
  documentos: "Documentos",
  notas: "Notas",
  mensajes: "Mensajes",
  citas: "Citas",
  usuarios: "Usuarios",
  ajustes: "Ajustes",
};

const TYPE_CATEGORY: Record<string, ActivityCategory> = {
  CASE_CREATED: "casos",
  STATUS_CHANGED: "casos",
  ASSIGNED: "casos",
  PROCESS_LINKED: "casos",
  CASE_REQUESTED: "casos",
  CASE_ACCEPTED: "casos",
  CASE_POSTPONED: "casos",
  CASE_REJECTED: "casos",
  CASES_EXPORTED: "casos",
  CASE_DELETED: "casos",
  DOC_UPLOADED: "documentos",
  NOTE_ADDED: "notas",
  MESSAGE_SENT: "mensajes",
  APPOINTMENT_CREATED: "citas",
  APPOINTMENT_CONFIRMED: "citas",
  APPOINTMENT_CANCELLED: "citas",
  APPOINTMENT_COMPLETED: "citas",
  USER_CREATED: "usuarios",
  USER_INVITED: "usuarios",
  USER_UPDATED: "usuarios",
  USER_DEACTIVATED: "usuarios",
  USER_REACTIVATED: "usuarios",
  CLIENTS_EXPORTED: "usuarios",
  SETTINGS_UPDATED: "ajustes",
  HOLIDAY_ADDED: "ajustes",
  HOLIDAY_REMOVED: "ajustes",
  HOLIDAYS_LOADED: "ajustes",
};

/** Grupo de un tipo de evento; null si es un tipo que aún no tiene grupo. */
export function categoryOf(type: string): ActivityCategory | null {
  return TYPE_CATEGORY[type] ?? null;
}

export type FirmActivityItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
  case: { id: string; title: string } | null;
};

export type FirmActivityResponse = {
  items: FirmActivityItem[];
  meta: { total: number; page: number; pageSize: number };
};

export type ActivityFilters = {
  category: ActivityCategory | "";
  actorId: string;
  from: string;
  to: string;
  page: number;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha AAAA-MM-DD que existe en el calendario (2026-02-30 no). */
export function isYmd(value: string): boolean {
  if (!YMD.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 2000 || y > 2100) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

type Params = { get(name: string): string | null };

/**
 * Filtros desde la URL (?grupo=&persona=&desde=&hasta=&pagina=). Lo que no es válido se
 * ignora en vez de romper la página: un enlace viejo o editado a mano sigue funcionando.
 */
export function readActivityFilters(params: Params, knownUserIds: readonly string[]): ActivityFilters {
  const group = params.get("grupo") ?? "";
  const category = (group in ACTIVITY_CATEGORY_LABEL ? group : "") as ActivityCategory | "";
  const person = params.get("persona") ?? "";
  const actorId = knownUserIds.includes(person) ? person : "";
  let from = params.get("desde") ?? "";
  let to = params.get("hasta") ?? "";
  if (!isYmd(from)) from = "";
  if (!isYmd(to)) to = "";
  // Rango al revés: se interpreta como el mismo rango ordenado
  if (from && to && from > to) [from, to] = [to, from];
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.get("pagina") ?? "", 10) || 1));
  return { category, actorId, from, to, page };
}

/** URL de la vista con esos filtros (los vacíos no se escriben). */
export function activityHref(pathname: string, f: ActivityFilters): string {
  const sp = new URLSearchParams();
  if (f.category) sp.set("grupo", f.category);
  if (f.actorId) sp.set("persona", f.actorId);
  if (f.from) sp.set("desde", f.from);
  if (f.to) sp.set("hasta", f.to);
  if (f.page > 1) sp.set("pagina", String(f.page));
  const s = sp.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** Consulta para la API (en inglés; los vacíos no se envían: la API los rechazaría). */
export function activityApiQuery(f: ActivityFilters, pageSize: number): string {
  const qs = new URLSearchParams({ page: String(f.page), pageSize: String(pageSize) });
  if (f.category) qs.set("category", f.category);
  if (f.actorId) qs.set("actorId", f.actorId);
  if (f.from) qs.set("from", f.from);
  if (f.to) qs.set("to", f.to);
  return qs.toString();
}

export function hasActivityFilters(f: ActivityFilters): boolean {
  return Boolean(f.category || f.actorId || f.from || f.to);
}
