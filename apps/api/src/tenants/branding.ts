import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/** Identidad de la firma: logo, color de marca y contacto (Admin › Ajustes). */

export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type LogoMime = (typeof LOGO_TYPES)[number];

/**
 * Tipo real del logo por su firma binaria, sin fiarse de la extensión ni del tipo declarado.
 * SVG no se admite: puede llevar scripts y se sirve sin sesión.
 */
export function sniffLogo(buf: Buffer): LogoMime | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export const logoUploadOptions: MulterOptions = {
  limits: { fileSize: LOGO_MAX_BYTES, files: 1, fields: 2, fieldSize: 256, parts: 3 },
  fileFilter: (_req, file, cb) => {
    if (!(LOGO_TYPES as readonly string[]).includes(file.mimetype)) {
      return cb(new BadRequestException('El logo debe ser una imagen PNG, JPG o WebP'), false);
    }
    cb(null, true);
  },
};

// ─── Color ──────────────────────────────────────────────────────────────────

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;
/** WCAG AA para texto normal: el color se usa de fondo de botones con texto blanco. */
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

/** Qué falla en un color de marca, o null si sirve. */
export function brandColorProblem(value: string): string | null {
  if (!HEX_COLOR.test(value)) return 'El color debe tener el formato #RRGGBB, por ejemplo #1f3d38';
  const ratio = contrastWithWhite(value);
  if (ratio < BRAND_MIN_CONTRAST) {
    return `El color es demasiado claro: el texto blanco encima no se leería bien (contraste ${ratio.toFixed(1)}:1, mínimo ${BRAND_MIN_CONTRAST}:1). Elige un tono más oscuro.`;
  }
  return null;
}

// ─── Contacto ───────────────────────────────────────────────────────────────

/** Teléfono: dígitos, espacios, guiones, paréntesis y un + inicial; entre 7 y 15 dígitos. */
export function phoneProblem(value: string): string | null {
  if (!/^\+?[0-9 ()-]+$/.test(value)) {
    return 'El teléfono solo puede llevar números, espacios, guiones, paréntesis y un + al principio';
  }
  const digits = value.replace(/\D/g, '').length;
  if (digits < 7 || digits > 15) return 'El teléfono debe tener entre 7 y 15 dígitos';
  return null;
}

/** Web pública: solo http(s), con dominio de verdad, sin usuario ni contraseña en la URL. */
export function websiteProblem(value: string): string | null {
  // new URL() descarta saltos de línea y tabuladores: se rechazan antes (la web acaba en el pie de los emails)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return 'La web no puede llevar espacios ni saltos de línea';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'Escribe la dirección completa, por ejemplo https://mifirma.ec';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'La web debe empezar por https:// o http://';
  if (url.username || url.password) return 'La web no puede llevar usuario ni contraseña';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return 'La web debe tener un dominio válido, como mifirma.ec';
  return null;
}
