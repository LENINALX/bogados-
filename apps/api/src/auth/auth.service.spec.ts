import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  const password = 'demo1234';
  let passwordHash: string;
  let prisma: {
    tenant: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  const activeAdmin = () => ({
    id: 'u1',
    email: 'admin@demo.bogados',
    name: 'Ana',
    role: Role.ADMIN,
    tenantId: 't1',
    active: true,
    passwordHash,
  });

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1', slug: 'firma-demo' }) },
      user: { findUnique: jest.fn() },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('fake.jwt.token') };
    service = new AuthService(prisma as never, jwt as unknown as JwtService, {} as never);
  });

  it('devuelve accessToken con credenciales válidas', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());

    const result = await service.login({
      email: 'Admin@Demo.Bogados ',
      password,
      tenantSlug: 'firma-demo',
    });

    expect(result.accessToken).toBe('fake.jwt.token');
    expect(result.user.email).toBe('admin@demo.bogados');
    expect(result.user.role).toBe(Role.ADMIN);
    expect(jwt.signAsync).toHaveBeenCalled();
  });

  it('busca al usuario dentro del tenant indicado', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());

    await service.login({ email: 'admin@demo.bogados', password, tenantSlug: 'firma-demo' });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { slug: 'firma-demo' } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { tenantId_email: { tenantId: 't1', email: 'admin@demo.bogados' } },
    });
  });

  it('rechaza tenant inexistente sin consultar usuarios', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'admin@demo.bogados', password, tenantSlug: 'otra-firma' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza contraseña incorrecta', async () => {
    prisma.user.findUnique.mockResolvedValue(activeAdmin());

    await expect(
      service.login({ email: 'admin@demo.bogados', password: 'wrongpass', tenantSlug: 'firma-demo' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza usuario inactivo', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeAdmin(), active: false });

    await expect(
      service.login({ email: 'admin@demo.bogados', password, tenantSlug: 'firma-demo' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
    service = new AuthService(prisma as never, {} as never, tokens as never);
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
