import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './password.dto';
import { RegisterClientDto } from './register-client.dto';
import { RegisterFirmDto } from './register-firm.dto';
import { ChangePasswordDto, VerifyLoginDto } from './login-security.dto';

/** Valida como el ValidationPipe global (transform + whitelist) y devuelve los campos con error. */
async function errorsOf<T extends object>(cls: new () => T, plain: Record<string, unknown>) {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, fields: errors.map((e) => e.property) };
}

const login = { email: 'Admin@Demo.Bogados ', password: 'demo1234', tenantSlug: ' Firma-Demo ' };

describe('LoginDto', () => {
  it('normaliza email y código de firma', async () => {
    const { dto, fields } = await errorsOf(LoginDto, login);
    expect(fields).toEqual([]);
    expect(dto.email).toBe('admin@demo.bogados');
    expect(dto.tenantSlug).toBe('firma-demo');
  });

  it('una contraseña corta pasa la validación: debe contar como intento fallido, no como 400', async () => {
    expect((await errorsOf(LoginDto, { ...login, password: 'x' })).fields).toEqual([]);
    expect((await errorsOf(LoginDto, { ...login, password: '' })).fields).toEqual(['password']);
  });

  it.each([
    ['email gigante', { email: `${'a'.repeat(250)}@x.ec` }, 'email'],
    ['email sin dominio', { email: 'admin' }, 'email'],
    ['contraseña de más de 72', { password: 'x'.repeat(73) }, 'password'],
    ['código con caracteres raros', { tenantSlug: "firma'; DROP TABLE" }, 'tenantSlug'],
    ['código larguísimo', { tenantSlug: 'a'.repeat(61) }, 'tenantSlug'],
    ['tipo equivocado', { password: 12345678 }, 'password'],
  ])('rechaza %s', async (_caso, patch, field) => {
    expect((await errorsOf(LoginDto, { ...login, ...patch })).fields).toContain(field);
  });

  it('rechaza campos que no existen (p. ej. intentar colar un rol)', async () => {
    expect((await errorsOf(LoginDto, { ...login, role: 'ADMIN' })).fields).toContain('role');
  });
});

describe('contraseñas nuevas', () => {
  it.each([
    ['restablecer', ResetPasswordDto, { token: 'x'.repeat(30) }, 'password'],
    ['cambiar', ChangePasswordDto, { currentPassword: 'actual' }, 'newPassword'],
    ['registrar firma', RegisterFirmDto, { firmName: 'Firma', slug: 'firma-x', name: 'Ana', email: 'a@b.ec' }, 'password'],
  ] as const)('%s: mínimo 8, máximo 72 y no solo espacios', async (_caso, cls, base, field) => {
    const check = async (pw: string) => (await errorsOf(cls as never, { ...base, [field]: pw })).fields;
    expect(await check('corta')).toContain(field);
    expect(await check(' '.repeat(10))).toContain(field);
    expect(await check('x'.repeat(73))).toContain(field);
    expect(await check('una-clave-segura')).not.toContain(field);
  });
});

describe('RegisterClientDto', () => {
  it('la contraseña temporal sigue la misma política (8 como mínimo)', async () => {
    const base = { email: 'cli@x.ec', name: 'Cliente' };
    expect((await errorsOf(RegisterClientDto, { ...base, password: '123456' })).fields).toContain('password');
    expect((await errorsOf(RegisterClientDto, { ...base, password: 'temporal-1' })).fields).toEqual([]);
    expect((await errorsOf(RegisterClientDto, base)).fields).toEqual([]);
  });

  it('acota el id del caso y recorta el nombre', async () => {
    const { dto, fields } = await errorsOf(RegisterClientDto, { email: 'cli@x.ec', name: '  Ana  ', caseId: 'x'.repeat(65) });
    expect(fields).toEqual(['caseId']);
    expect(dto.name).toBe('Ana');
  });
});

describe('ForgotPasswordDto y VerifyLoginDto', () => {
  it('recuperar: mismos formatos que el login', async () => {
    expect((await errorsOf(ForgotPasswordDto, { email: 'a@b.ec', tenantSlug: 'firma-demo' })).fields).toEqual([]);
    expect((await errorsOf(ForgotPasswordDto, { email: 'no', tenantSlug: '!!' })).fields.sort()).toEqual(['email', 'tenantSlug']);
  });

  it('el desafío del código es un UUID y el código, 6 dígitos', async () => {
    const ok = { challengeId: '7b1f5c0e-2b8e-4b1a-9f1e-1c2d3e4f5a6b', code: '012345' };
    expect((await errorsOf(VerifyLoginDto, ok)).fields).toEqual([]);
    expect((await errorsOf(VerifyLoginDto, { ...ok, challengeId: '../../etc' })).fields).toEqual(['challengeId']);
    expect((await errorsOf(VerifyLoginDto, { ...ok, code: '12a456' })).fields).toEqual(['code']);
  });
});

describe('emails: solo ASCII, sin comas ni espacios', () => {
  it.each([
    ['josé@firma.ec', 'tildes'],
    ['ana@firmá.ec', 'tildes'],
    ['peña@firma.ec', 'ñ'],
    ['ana,perez@firma.ec', 'comas'],
    ['ana@firma.ec;otro@x.ec', 'punto y coma'],
    ['ana perez@firma.ec', 'espacios'],
  ])('%s → rechazado (%s)', async (email, motivo) => {
    const dto = plainToInstance(LoginDto, { ...login, email });
    const [error] = await validate(dto);
    expect(error?.property).toBe('email');
    expect(Object.values(error.constraints ?? {}).join(' ')).toContain(motivo);
  });

  it('un email normal pasa', async () => {
    expect((await errorsOf(LoginDto, { ...login, email: 'Ana.Perez+casos@Mi-Firma.com.ec' })).fields).toEqual([]);
  });
});
