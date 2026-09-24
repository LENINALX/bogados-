/**
 * Cliente hacia el backend NestJS (fuente de verdad para casos/docs/mensajes/usuarios).
 * El JWT de Nest se guarda en sessionStorage tras el login (dual con NextAuth).
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001/api/v1";

export const NEST_TOKEN_KEY = "bogados_nest_token";

export class NestApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NestApiError";
  }
}

export function getNestToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(NEST_TOKEN_KEY);
}

export function setNestToken(token: string) {
  sessionStorage.setItem(NEST_TOKEN_KEY, token);
}

export function clearNestToken() {
  sessionStorage.removeItem(NEST_TOKEN_KEY);
}

export async function nestLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new NestApiError(err.error || "Login Nest falló", res.status);
  }
  const json = await res.json();
  const payload = json.data ?? json;
  if (payload.accessToken) setNestToken(payload.accessToken);
  return payload;
}

type NestOptions = RequestInit & { formData?: FormData };

export async function nestFetch<T = unknown>(
  path: string,
  options: NestOptions = {},
): Promise<T> {
  const token = getNestToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body = options.body;
  if (options.formData) {
    body = options.formData;
  }
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Error API ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await res.json();
    return (json.data !== undefined ? json.data : json) as T;
  }
  return res as unknown as T;
}

export function nestDocumentDownloadUrl(documentId: string) {
  const token = getNestToken();
  // Download needs Authorization header — components use nestDownloadBlob instead for ACL
  return `${API_BASE}/documents/${documentId}/download${token ? `?t=1` : ""}`;
}

export async function nestDownloadBlob(documentId: string, fileName: string) {
  const token = getNestToken();
  const res = await fetch(`${API_BASE}/documents/${documentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo descargar");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export { API_BASE as NEST_API_BASE };
