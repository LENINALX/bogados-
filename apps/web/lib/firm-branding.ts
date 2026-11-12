/**
 * Identidad de la firma (Admin › Ajustes): mismas reglas que la API
 * (apps/api/src/tenants/branding.ts), para avisar antes de enviar.
 */

/** Color de Bogados: el que se usa si la firma no elige otro. */
export const BOGADOS_BRAND = "#1f3d38";

/** Tonos oscuros con contraste de sobra para texto blanco. */
export const BRAND_PRESETS = [
  { value: "#1f3d38", label: "Pino (Bogados)" },
  { value: "#1e3a5f", label: "Azul marino" },
  { value: "#7a1f2b", label: "Burdeos" },
  { value: "#3f2d56", label: "Ciruela" },
  { value: "#5b3a1e", label: "Nogal" },
  { value: "#2f3a45", label: "Pizarra" },
] as const;

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const BRAND_MIN_CONTRAST = 4.5;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste del texto blanco sobre el color (1 a 21). */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

export function brandColorProblem(value: string): string | null {
  if (!value) return null;
  if (!HEX_COLOR.test(value)) return "El color debe tener el formato #RRGGBB, por ejemplo #1f3d38.";
  const ratio = contrastWithWhite(value);
  if (ratio < BRAND_MIN_CONTRAST) {
    return `Es demasiado claro: el texto blanco encima no se leería (contraste ${ratio.toFixed(1)}:1, mínimo ${BRAND_MIN_CONTRAST}:1). Elige un tono más oscuro.`;
  }
  return null;
}

export function phoneProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^\+?[0-9 ()-]+$/.test(v)) return "Solo números, espacios, guiones, paréntesis y un + al principio.";
  const digits = v.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) return "El teléfono debe tener entre 7 y 15 dígitos.";
  return null;
}

export function websiteProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return "Escribe la dirección completa, por ejemplo https://mifirma.ec.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "La web debe empezar por https:// o http://.";
  if (url.username || url.password) return "La web no puede llevar usuario ni contraseña.";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return "La web debe tener un dominio válido, como mifirma.ec.";
  return null;
}

/** «mifirma.ec» → «https://mifirma.ec»: lo habitual es escribirla sin el protocolo. */
export function normalizeWebsite(value: string): string {
  const v = value.trim();
  if (!v || /^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return `https://${v}`;
}

export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function logoFileProblem(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "El logo debe ser una imagen PNG, JPG o WebP.";
  if (file.size > LOGO_MAX_BYTES) return "El logo no puede pasar de 512 KB. Prueba a exportarlo más pequeño.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

/** URL del logo desde el mismo dominio de la web; la versión invalida la caché al cambiarlo. */
export function firmLogoUrl(slug: string, version: number | string): string {
  return `/api/firmas/${encodeURIComponent(slug)}/logo?v=${version}`;
}

/** «Firma Demo Abogados» → «FD» */
export function firmMonogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w) && w.length > 2);
  return ((words[0]?.[0] ?? name[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}
