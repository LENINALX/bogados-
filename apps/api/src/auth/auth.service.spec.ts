import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { ACCOUNT_LOCKOUT, AuthService } from './auth.service';

describe('AuthService.login', () => {
  const password = 'demo1234';
  let passwordHash: string;
  let prisma: {
    tenant: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwt: { signAsync: jest.Mock };
  let loginEvents: { record: jest.Mock; recentPasswordFailures: jest.Mock };
  let twoFactor: { start: jest.Mock; verify: jest.Mock };
  let service: AuthService;

  const tenant = { id: 't1', slug: 'firma-demo', name: 'Firma Demo', requireTwoFactor: false };
  const activeAdmin = () => ({
    id: 'u1',
    email: 'admin@demo.bogados',
    name: 'Ana',
    role: Role.ADMIN,
    tenantId: 't1',
    active: true,
    twoFactorEnabled: false,
    lastLoginAt: new Date('2026-10-18T13:00:00Z'),
    passwordHash,
  });
  const meta = { ip: '190.1.2.3', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0' };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(tenant) },
      user: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('fake.jwt.token') };
    loginEvents = { record: jest.fn(), recentPasswordFailures: jest.fn().mockResolvedValue({ count: 0, oldest: null }) };
    twoFactor = {
      start: jest.fn().mockResolvedValue({ twoFactorRequired: true, challengeId: 'ch1' }),
      verify: jest.fn(),
    };
    service = new AuthService(
      prisma as never,
      jwt as unknown as JwtService,
      {} as never,
      loginEvents as never,
      twoFactor as never,
    );
  });

  const login = (
    over: Partial<{ email: string; password: string; tenantSlug: string; remember: boolean }> = {},
  ) => service.login({ email: 'admin@demo.bogados', password, tenantSlug: 'firma-demo', ...over }, meta);

  it('credenciales válidas: token de 12 h, acceso registrado y acceso anterior devuelto', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());

    const result = (await login({ email: 'Admin@Demo.Bogados ' })) as {
      accessToken: string;
      user: { email: string };
      previousLoginAt: string;
    };

    expect(result.accessToken).toBe('fake.jwt.token');
    expect(result.user.email).toBe('admin@demo.bogados');
    expect(result.previousLoginAt).toBe('2026-10-18T13:00:00.000Z');
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ sub: 'u1' }), { expiresIn: '12h' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(loginEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', userId: 'u1', success: true, reason: 'password', ip: '190.1.2.3' }),
      prisma,
    );
  });

  it('«mantener la sesión iniciada» emite un token de 30 días', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());
    await login({ remember: true });
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.anything(), { expiresIn: '30d' });
  });

  it('busca al usuario dentro del tenant indicado', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());
    await login();
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { slug: 'firma-demo' } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { tenantId_email: { tenantId: 't1', email: 'admin@demo.bogados' } },
    });
  });

  it('firma inexistente: rechaza sin consultar usuarios ni registrar (no hay firma a la que asociarlo)', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(login({ tenantSlug: 'otra-firma' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(loginEvents.record).not.toHaveBeenCalled();
  });

  it.each([
    ['contraseña incorrecta', () => activeAdmin(), 'wrongpass', 'bad_password'],
    ['email inexistente', () => null, password, 'unknown_user'],
    ['usuario desactivado', () => ({ ...activeAdmin(), active: false }), password, 'inactive'],
    // Con la contraseña mal no se revela que además está desactivada
    ['desactivado y contraseña mal', () => ({ ...activeAdmin(), active: false }), 'wrongpass', 'bad_password'],
  ])('%s: mismo error para todos, motivo real en el registro', async (_caso, user, pass, reason) => {
    prisma.user.findUnique.mockResolvedValue(user());
    await expect(login({ password: pass })).rejects.toThrow('Credenciales inválidas');
    expect(loginEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, reason, email: 'admin@demo.bogados' }),
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('cada fallo dice cuántos intentos quedan antes del bloqueo', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());
    loginEvents.recentPasswordFailures.mockResolvedValue({ count: 2, oldest: new Date() });
    const err = await login({ password: 'wrongpass' }).catch((e) => e);
    expect(err.getResponse()).toEqual({
      message: 'Credenciales inválidas',
      error: { code: 'INVALID_CREDENTIALS', remainingAttempts: ACCOUNT_LOCKOUT.maxFailures - 3 },
    });
    expect(loginEvents.recentPasswordFailures).toHaveBeenCalledWith('t1', 'admin@demo.bogados', ACCOUNT_LOCKOUT.windowMs);
  });

  it('cuenta bloqueada: 429 con el tiempo de espera, aunque la contraseña sea correcta', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());
    const oldest = new Date(Date.now() - 5 * 60_000);
    loginEvents.recentPasswordFailures.mockResolvedValue({ count: ACCOUNT_LOCKOUT.maxFailures, oldest });
    const err = await login().catch((e) => e);
    expect(err.getStatus()).toBe(429);
    const { code, retryAfterSeconds } = err.getResponse().error;
    expect(code).toBe('ACCOUNT_LOCKED');
    // La ventana es de 15 min desde el fallo más antiguo: quedan unos 10
    expect(retryAfterSeconds).toBeGreaterThan(9 * 60);
    expect(retryAfterSeconds).toBeLessThanOrEqual(10 * 60);
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(loginEvents.record).not.toHaveBeenCalled();
  });

  it('cuenta con dos pasos: envía el código y no emite token', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeAdmin(), twoFactorEnabled: true });
    await expect(login({ remember: true })).resolves.toMatchObject({ twoFactorRequired: true, challengeId: 'ch1' });
    expect(twoFactor.start).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), tenant, {
      remember: true,
      ...meta,
    });
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(loginEvents.record).not.toHaveBeenCalled();
  });

  it('la firma exige dos pasos al equipo, no a los clientes', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ ...tenant, requireTwoFactor: true });
    prisma.user.findUnique.mockResolvedValue(activeAdmin());
    await login();
    expect(twoFactor.start).toHaveBeenCalledTimes(1);

    prisma.user.findUnique.mockResolvedValue({ ...activeAdmin(), role: Role.CLIENTE });
    await login();
    expect(twoFactor.start).toHaveBeenCalledTimes(1);
    expect(jwt.signAsync).toHaveBeenCalledTimes(1);
  });

  it('verifyLogin: completa el acceso con el origen y la duración guardados en el desafío', async () => {
    twoFactor.verify.mockResolvedValue({
      remember: true,
      ip: '10.0.0.9',
      userAgent: 'Safari',
      user: { ...activeAdmin(), twoFactorEnabled: true, tenant },
    });
    await service.verifyLogin({ challengeId: 'ch1', code: '123456' });
    expect(twoFactor.verify).toHaveBeenCalledWith('ch1', '123456');
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.anything(), { expiresIn: '30d' });
    expect(loginEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, reason: 'two_factor', ip: '10.0.0.9', userAgent: 'Safari' }),
      prisma,
    );
  });
});

describe('AuthService: seguridad de la cuenta', () => {
  const password = 'demo1234';
  let passwordHash: string;
  let prisma: { user: { findUniqueOrThrow: jest.Mock; update: jest.Mock } };
  let service: AuthService;
  const actor = { id: 'u1', email: 'a@x', role: Role.ABOGADO, tenantId: 't1', name: 'Luis' };
  const account = (requireTwoFactor = false) => ({
    id: 'u1',
    role: Role.ABOGADO,
    passwordHash,
    tenant: { requireTwoFactor },
  });

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    prisma = { user: { findUniqueOrThrow: jest.fn(async () => account()), update: jest.fn() } };
    service = new AuthService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  });

  it('activar los dos pasos pide la contraseña (400, no 401: un 401 cerraría la sesión)', async () => {
    await expect(service.updateTwoFactor({ enabled: true, password: 'mal' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.updateTwoFactor({ enabled: true, password }, actor)).resolves.toEqual({
      twoFactorEnabled: true,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { twoFactorEnabled: true } });
  });

  it('no se puede desactivar si la firma lo exige al equipo', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(account(true));
    await expect(service.updateTwoFactor({ enabled: false, password }, actor)).rejects.toThrow('Tu firma exige');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('cambiar la contraseña invalida las sesiones abiertas y no admite repetir la actual', async () => {
    await expect(
      service.changePassword({ currentPassword: password, newPassword: password }, actor),
    ).rejects.toThrow('distinta');
    await service.changePassword({ currentPassword: password, newPassword: 'nueva-clave-segura' }, actor);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordChangedAt).toBeInstanceOf(Date);
    expect(await bcrypt.compare('nueva-clave-segura', data.passwordHash)).toBe(true);
  });
});

describe('AuthService.forgotPassword', () => {
  let prisma: { tenant: { findUnique: jest.Mock }; user: { findUnique: jest.Mock } };
  let tokens: { send: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
      user: { findUnique: jest.fn() },
    };
    tokens = { send: jest.fn().mockResolvedValue(true) };
    service = new AuthService(prisma as never, {} as never, tokens as never, {} as never, {} as never);
  });

  const dto = { tenantSlug: 'firma-demo', email: 'Admin@Demo.Bogados' };

  it('usuario activo → envía enlace de recuperación', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', active: true });
    await expect(service.forgotPassword(dto)).resolves.toEqual({ ok: true });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { tenantId_email: { tenantId: 't1', email: 'admin@demo.bogados' } },
    });
    expect(tokens.send).toHaveBeenCalledWith('u1', 'RESET');
  });

  it.each([
    ['email inexistente', () => prisma.user.findUnique.mockResolvedValue(null)],
    ['usuario desactivado', () => prisma.user.findUnique.mockResolvedValue({ id: 'u1', active: false })],
    ['firma inexistente', () => prisma.tenant.findUnique.mockResolvedValue(null)],
  ])('%s → misma respuesta y no envía nada', async (_caso, setup) => {
    setup();
    await expect(service.forgotPassword(dto)).resolves.toEqual({ ok: true });
    expect(tokens.send).not.toHaveBeenCalled();
  });
});
