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
    user: { findUnique: jest.Mock; findFirst: jest.Mock };
  };
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('fake.jwt.token') };
    service = new AuthService(prisma as never, jwt as unknown as JwtService);
  });

  it('devuelve accessToken con credenciales válidas', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'admin@demo.bogados',
      name: 'Ana',
      role: Role.ADMIN,
      tenantId: 't1',
      active: true,
      passwordHash,
    });

    const result = await service.login({
      email: 'admin@demo.bogados',
      password,
    });

    expect(result.accessToken).toBe('fake.jwt.token');
    expect(result.user.email).toBe('admin@demo.bogados');
    expect(result.user.role).toBe(Role.ADMIN);
    expect(jwt.signAsync).toHaveBeenCalled();
  });

  it('rechaza contraseña incorrecta', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'admin@demo.bogados',
      name: 'Ana',
      role: Role.ADMIN,
      tenantId: 't1',
      active: true,
      passwordHash,
    });

    await expect(
      service.login({ email: 'admin@demo.bogados', password: 'wrongpass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza usuario inactivo', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'admin@demo.bogados',
      name: 'Ana',
      role: Role.ADMIN,
      tenantId: 't1',
      active: false,
      passwordHash,
    });

    await expect(
      service.login({ email: 'admin@demo.bogados', password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
