import type { CaseRequestState, CaseStatus } from "@bogados/shared";

/** Respuesta de GET /search (API Nest). */
export type SearchCase = {
  id: string;
  title: string;
  status: CaseStatus;
  requestState: CaseRequestState | null;
  matterType: string | null;
  processNumber: string | null;
  updatedAt: string;
  client: { id: string; name: string } | null;
  lawyer: { id: string; name: string } | null;
};
export type SearchClient = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  caseCount: number;
  latestCase: { id: string; title: string } | null;
};
export type SearchDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sharedWithClient: boolean;
  createdAt: string;
  case: { id: string; title: string };
};
type Group<T> = { items: T[]; hasMore: boolean };
export type SearchResponse = {
  query: string;
  cases: Group<SearchCase>;
  clients: Group<SearchClient>;
  documents: Group<SearchDocument>;
};

/** Igual que la API: por debajo no se busca. */
export const SEARCH_MIN_LENGTH = 2;

export type SearchRole = "ADMIN" | "ABOGADO" | "CLIENTE" | string;

export function caseHref(role: SearchRole, caseId: string) {
  return role === "CLIENTE" ? `/portal/casos/${caseId}` : `/casos/${caseId}`;
}

export function documentHref(role: SearchRole, caseId: string) {
  return `${caseHref(role, caseId)}#documentos`;
}

/**
 * Dónde lleva un cliente encontrado: a su caso si solo hay uno (o si quien busca es su abogado,
 * al más reciente); el admin con varios casos (o ninguno) va a su ficha en Usuarios.
 */
export function clientHref(role: SearchRole, c: SearchClient) {
  if (c.latestCase && (c.caseCount === 1 || role !== "ADMIN")) return `/casos/${c.latestCase.id}`;
  if (role === "ADMIN") return `/admin/usuarios?role=CLIENTE&q=${encodeURIComponent(c.email)}`;
  return "/dashboard";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Total de resultados mostrados (para anunciarlo al lector de pantalla). */
export function resultCount(r: SearchResponse) {
  return r.cases.items.length + r.clients.items.length + r.documents.items.length;
}
