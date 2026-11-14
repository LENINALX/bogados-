/**
 * Parámetros de la URL en páginas del servidor. Next entrega `string | string[] | undefined`:
 * `?q=a&q=b` llega como array y `?page=9999999999999999999` como un número que Prisma no acepta.
 * Estos helpers devuelven siempre un valor utilizable (o undefined) en vez de romper la página.
 */

type Raw = string | string[] | undefined;

/** Primer valor, sin espacios alrededor y acotado. Vacío → undefined. */
export function textParam(raw: Raw, max = 200): string | undefined {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, max);
  return value ? value : undefined;
}

/** Página 1…max (la API admite hasta 10 000). Cualquier otra cosa → 1. */
export function pageParam(raw: Raw, max = 10_000): number {
  const n = Number.parseInt(textParam(raw, 12) ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : 1;
}

/** Solo uno de los valores permitidos. */
export function oneOf<T extends string>(raw: Raw, allowed: readonly T[]): T | undefined {
  const value = textParam(raw, 60);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
