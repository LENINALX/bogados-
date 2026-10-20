import { BadRequestException, ValidationError } from '@nestjs/common';

/** Nombres de campo legibles para los mensajes por defecto de class-validator. */
const FIELD_NAMES: Record<string, string> = {
  email: 'el email',
  password: 'la contraseña',
  newPassword: 'la contraseña nueva',
  currentPassword: 'la contraseña actual',
  tenantSlug: 'el código de firma',
  slug: 'el código de firma',
  name: 'el nombre',
  firmName: 'el nombre de la firma',
  title: 'el título',
  description: 'la descripción',
  body: 'el texto',
  reason: 'el motivo',
  note: 'la nota',
  code: 'el código',
  token: 'el enlace',
  status: 'el estado',
  role: 'el rol',
  date: 'la fecha',
  startsAt: 'la fecha de inicio',
  endsAt: 'la fecha de fin',
  dueAt: 'el vencimiento',
  page: 'la página',
  pageSize: 'el tamaño de página',
};

const field = (p: string) => FIELD_NAMES[p] ?? `«${p}»`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Traducciones de los mensajes por defecto (los mensajes propios, ya en español, pasan tal cual). */
const DEFAULTS: Array<[RegExp, (prop: string, ...m: string[]) => string]> = [
  [/^property (\S+) should not exist$/, (_p, name) => `No se admite ${field(name)}`],
  [/must be shorter than or equal to (\d+) characters$/, (p, n) => `${capital(field(p))} no puede tener más de ${n} caracteres`],
  [/must be longer than or equal to (\d+) characters$/, (p, n) => `${capital(field(p))} debe tener al menos ${n} caracteres`],
  [/should not be empty$/, (p) => `${capital(field(p))} es obligatorio`],
  [/must be a string$/, (p) => `${capital(field(p))} debe ser texto`],
  [/must be an email$/, (p) => `${capital(field(p))} no es un email válido`],
  [/must be a boolean value$/, (p) => `${capital(field(p))} debe ser sí o no`],
  [/must be an integer number$/, (p) => `${capital(field(p))} debe ser un número entero`],
  [/must be a number conforming to the specified constraints$/, (p) => `${capital(field(p))} debe ser un número`],
  [/must not be less than (-?[\d.]+)$/, (p, n) => `${capital(field(p))} no puede ser menor que ${n}`],
  [/must not be greater than (-?[\d.]+)$/, (p, n) => `${capital(field(p))} no puede ser mayor que ${n}`],
  [/must be one of the following values: (.+)$/, (p, v) => `${capital(field(p))} debe ser uno de estos valores: ${v}`],
  [/must be a valid enum value$/, (p) => `${capital(field(p))} no tiene un valor válido`],
  [/must be a UUID$/, (p) => `${capital(field(p))} no es un identificador válido`],
  [/must match .+ regular expression$/, (p) => `${capital(field(p))} no tiene el formato correcto`],
  [/must be a valid ISO 8601 date string$/, (p) => `${capital(field(p))} debe ser una fecha válida`],
  [/must be a Date instance$/, (p) => `${capital(field(p))} debe ser una fecha válida`],
  [/must be an array$/, (p) => `${capital(field(p))} debe ser una lista`],
  [/must contain no more than (\d+) elements$/, (p, n) => `${capital(field(p))} admite como máximo ${n} elementos`],
  [/must be an object$/, (p) => `${capital(field(p))} no tiene el formato correcto`],
];

export function translateValidationMessage(property: string, message: string): string {
  for (const [re, fn] of DEFAULTS) {
    const m = message.match(re);
    if (m) return fn(property, ...m.slice(1));
  }
  return message;
}

/** Aplana errores anidados («direccion.calle») y traduce cada mensaje. */
export function flattenValidationErrors(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((e) => {
    const path = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((msg) => translateValidationMessage(e.property, msg));
    return [...own, ...flattenValidationErrors(e.children ?? [], path)];
  });
}

/** Para el ValidationPipe global: mismo formato de error de siempre, en español. */
export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException([...new Set(flattenValidationErrors(errors))]);
}
