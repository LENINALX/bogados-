import { Transform } from 'class-transformer';

/**
 * Convierte "true"/"false" de query strings a boolean.
 *
 * No usar `@Type(() => Boolean)`: aplica `Boolean("false") === true`. Además,
 * con `enableImplicitConversion` el `value` que recibe `@Transform` ya viene
 * convertido, así que se lee el valor original desde `obj[key]`.
 * Cualquier otro valor se deja tal cual para que `@IsBoolean()` lo rechace.
 */
export function ToBoolean() {
  return Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown>)[key];
    if (raw === true || raw === 'true' || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === '0') return false;
    return raw;
  });
}
