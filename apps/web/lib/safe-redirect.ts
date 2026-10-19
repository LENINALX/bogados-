/** Rutas a las que no tiene sentido volver después de entrar. */
const AUTH_PATHS = ["/login", "/recuperar", "/restablecer", "/api/auth"];

/**
 * A dónde ir tras iniciar sesión. El middleware de NextAuth manda `callbackUrl` con la URL
 * completa de la página protegida; solo se acepta si es de este mismo sitio, para que un
 * enlace malicioso no pueda llevar a otro dominio después de entrar (open redirect).
 */
export function safeCallbackPath(raw: string | null | undefined, origin: string, fallback = "/"): string {
  if (!raw) return fallback;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== origin) return fallback;
  // «//otro.com» y «/\otro.com» se resuelven como otro origen en algunos navegadores
  if (/^\/[\\/]/.test(raw)) return fallback;
  if (AUTH_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
