/**
 * Cliente hacia el backend NestJS (fuente de verdad para casos/docs/mensajes/usuarios).
 * El JWT de Nest vive en la sesión de NextAuth (cookie); se obtiene con getSession()
 * y se cachea en memoria de la pestaña.
 */
import { getSession, signOut } from "next-auth/react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001/api/v1";

export class NestApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NestApiError";
  }
}

let tokenPromise: Promise<string | null> | null = null;
let signingOut = false;

async function getNestToken(): Promise<string | null> {
  if (!tokenPromise) {
    tokenPromise = getSession()
      .then((s) => (s && !s.error ? s.accessToken ?? null : null))
      .catch(() => null);
  }
  const token = await tokenPromise;
  if (!token) tokenPromise = null; // no cachear la ausencia: reintentar en la próxima llamada
  return token;
}

export function clearNestToken() {
  tokenPromise = null;
}

/** Sesión caducada, revocada o rechazada por la API: volver al login una sola vez. */
function sessionExpired(): never {
  clearNestToken();
  if (!signingOut) {
    signingOut = true;
    signOut({ callbackUrl: "/login?error=expired" });
  }
  throw new NestApiError("Tu sesión ha caducado. Vuelve a iniciar sesión.", 401);
}

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const token = await getNestToken();
  if (!token) sessionExpired();

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });
  if (res.status === 401) sessionExpired();
  return res;
}

/** Llamada sin sesión (recuperar contraseña, activar cuenta). Lanza NestApiError si falla. */
export async function nestPublicFetch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new NestApiError(json.error || `Error API ${res.status}`, res.status);
  return (json.data !== undefined ? json.data : json) as T;
}

type NestOptions = RequestInit & { formData?: FormData };

export async function nestFetch<T = unknown>(
  path: string,
  options: NestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});

  let body = options.body;
  if (options.formData) {
    body = options.formData;
  }
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await authorizedFetch(path, { ...options, headers, body });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new NestApiError(err.error || `Error API ${res.status}`, res.status);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await res.json();
    return (json.data !== undefined ? json.data : json) as T;
  }
  return res as unknown as T;
}

export async function nestDownloadBlob(documentId: string, fileName: string) {
  const res = await authorizedFetch(`/documents/${documentId}/download`);
  if (!res.ok) throw new NestApiError("No se pudo descargar", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export { API_BASE as NEST_API_BASE };
