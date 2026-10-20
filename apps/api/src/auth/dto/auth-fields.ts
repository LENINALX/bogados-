import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

/** RFC 5321: 254 caracteres como máximo en una dirección de correo. */
export const EMAIL_MAX = 254;
/** Código de firma (slug del tenant), como lo guarda TenantsService. */
export const TENANT_SLUG = /^[a-z0-9-]{2,60}$/;

const normalize = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Email normalizado (minúsculas, sin espacios) y acotado. */
export function EmailField(): PropertyDecorator {
  return (target, key) => {
    Transform(normalize)(target, key);
    IsEmail({}, { message: 'Escribe un email válido' })(target, key);
    MaxLength(EMAIL_MAX, { message: `El email no puede tener más de ${EMAIL_MAX} caracteres` })(target, key);
  };
}

/** Código de firma normalizado: minúsculas, números y guiones. */
export function TenantSlugField(): PropertyDecorator {
  return (target, key) => {
    Transform(normalize)(target, key);
    IsString()(target, key);
    Matches(TENANT_SLUG, { message: 'El código de firma solo lleva minúsculas, números y guiones' })(target, key);
  };
}
