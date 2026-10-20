import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidationOptions,
  isISO8601,
} from 'class-validator';

/**
 * Validaciones reutilizables de la API. Todas devuelven mensajes en español
 * (los muestra la web tal cual) y no dejan llegar a Prisma valores absurdos.
 */

// ─── Identificadores ────────────────────────────────────────────────────────

/** Los ids son cuid (25 caracteres); se admite cualquier id alfanumérico razonable. */
export const ID_MAX_LENGTH = 64;
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** Id de otro registro en el cuerpo o la query (lawyerId, caseId…). */
export function IsId(label: string, options?: ValidationOptions): PropertyDecorator {
  return applyDecorators(
    IsString({ ...options, message: `${label} no es válido` }),
    Matches(ID_PATTERN, { ...options, message: `${label} no es válido` }),
  );
}

/** "" → null: un select vacío de la web significa «sin valor», no un id. */
export function EmptyToNull(): PropertyDecorator {
  return Transform(({ value }) => (value === '' ? null : value));
}

// ─── Texto ──────────────────────────────────────────────────────────────────

/** Recorta espacios al principio y al final (deja igual lo que no sea texto). */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
}

/** Recorta y pasa a minúsculas (emails, códigos). */
export function TrimLower(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
}

/**
 * Caracteres de control (y los de cambio de dirección del texto, con los que
 * "contrato‮fdp.exe" se ve como "contratoexe.pdf"). En textos de una línea
 * tampoco se admiten saltos de línea: acaban en asuntos de email y notificaciones.
 */
// eslint-disable-next-line no-control-regex
const SINGLE_LINE_FORBIDDEN = /[\u0000-\u001f\u007f‪-‮⁦-⁩]/;
/** En textos largos se permiten tabulador y saltos de línea. */
// eslint-disable-next-line no-control-regex
const MULTILINE_FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/;

export function hasForbiddenChars(value: string, multiline = false): boolean {
  return (multiline ? MULTILINE_FORBIDDEN : SINGLE_LINE_FORBIDDEN).test(value);
}

export type TextFieldOptions = {
  /** Nombre del campo tal como lo ve el usuario: «Título», «Mensaje»… */
  label: string;
  max: number;
  /** Tras recortar espacios. 0 = puede quedar vacío. */
  min?: number;
  /** Permite saltos de línea (descripciones, notas, mensajes). */
  multiline?: boolean;
  /** Mensaje propio para el mínimo. */
  minMessage?: string;
};

/**
 * Texto libre: recorta espacios, exige `min` caracteres reales (así «   » no
 * pasa como título), limita a `max` y rechaza caracteres de control.
 * Combínalo con `@IsOptional()` si el campo no es obligatorio.
 */
export function TextField({ label, max, min = 0, multiline = false, minMessage }: TextFieldOptions): PropertyDecorator {
  const decorators: PropertyDecorator[] = [
    Trim(),
    IsString({ message: `${label}: debe ser texto` }),
  ];
  if (min > 0) {
    decorators.push(
      MinLength(min, {
        message:
          minMessage ??
          (min === 1 ? `${label}: no puede estar vacío` : `${label}: escribe al menos ${min} caracteres`),
      }),
    );
  }
  decorators.push(
    MaxLength(max, { message: `${label}: máximo ${max} caracteres` }),
    ValidateBy({
      name: 'noControlChars',
      validator: {
        validate: (value: unknown) => typeof value !== 'string' || !hasForbiddenChars(value, multiline),
        defaultMessage: () =>
          multiline
            ? `${label}: contiene caracteres no permitidos`
            : `${label}: no puede tener saltos de línea ni caracteres de control`,
      },
    }),
  );
  return applyDecorators(...decorators);
}

// ─── Email ──────────────────────────────────────────────────────────────────

/** RFC 5321: una dirección no pasa de 254 caracteres. */
export const EMAIL_MAX_LENGTH = 254;

export function EmailField(): PropertyDecorator {
  return applyDecorators(
    TrimLower(),
    IsEmail({}, { message: 'Escribe un email válido' }),
    MaxLength(EMAIL_MAX_LENGTH, { message: `El email admite como máximo ${EMAIL_MAX_LENGTH} caracteres` }),
  );
}

// ─── Fechas ─────────────────────────────────────────────────────────────────

/** Años con sentido para un despacho: evita fechas como 0001-01-01 o 275760-09-13. */
export const DATE_YEAR_MIN = 2000;
export const DATE_YEAR_MAX = 2100;

const YMD_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-02-30" tiene el formato pero no existe; se comprueba el calendario. */
export function isValidYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !YMD_FORMAT.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < DATE_YEAR_MIN || y > DATE_YEAR_MAX) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Fecha de calendario AAAA-MM-DD real y dentro de los años admitidos. */
export function IsYmd(label: string, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isYmd',
      validator: {
        validate: (value: unknown) => isValidYmd(value),
        defaultMessage: () =>
          `${label} debe ser una fecha válida con formato AAAA-MM-DD (entre ${DATE_YEAR_MIN} y ${DATE_YEAR_MAX})`,
      },
    },
    options,
  );
}

export function isValidIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 40) return false;
  if (!isISO8601(value, { strict: true })) return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  const year = new Date(time).getUTCFullYear();
  return year >= DATE_YEAR_MIN && year <= DATE_YEAR_MAX;
}

/** Fecha y hora ISO 8601 válida (p. ej. 2026-10-15T18:00:00.000Z) dentro de los años admitidos. */
export function IsIsoDateTime(label: string, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isIsoDateTime',
      validator: {
        validate: (value: unknown) => isValidIsoDateTime(value),
        defaultMessage: () =>
          `${label} debe ser una fecha ISO válida (p. ej. 2026-10-15T18:00:00.000Z) entre ${DATE_YEAR_MIN} y ${DATE_YEAR_MAX}`,
      },
    },
    options,
  );
}
