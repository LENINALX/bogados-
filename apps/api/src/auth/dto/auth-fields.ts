import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

/** Código de firma (slug del tenant), como lo guarda TenantsService. */
export const TENANT_SLUG = /^[a-z0-9-]{2,60}$/;

const normalize = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Un solo EmailField para toda la API (validators.ts): solo ASCII, sin comas ni espacios. */
export { EmailField } from '../../common/validation/validators';

/** Código de firma normalizado: minúsculas, números y guiones. */
export function TenantSlugField(): PropertyDecorator {
  return (target, key) => {
    Transform(normalize)(target, key);
    IsString()(target, key);
    Matches(TENANT_SLUG, { message: 'El código de firma solo lleva minúsculas, números y guiones' })(target, key);
  };
}
