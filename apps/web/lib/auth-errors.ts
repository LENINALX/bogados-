/**
 * Códigos que `signIn()` devuelve en `res.error` cuando `authorize()` lanza.
 * Módulo aparte para que la página de login (cliente) no importe lib/auth.ts (Prisma).
 */
export const API_UNAVAILABLE = "API_UNAVAILABLE";
export const TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS";
