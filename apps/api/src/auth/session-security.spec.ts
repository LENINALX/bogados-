import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { Role, UserTokenType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AccountTokensService, hashToken, VERIFY_RESEND_COOLDOWN_MS } from './account-tokens.service';
import { AuthService } from './auth.service';
import { assertInvitationQuota, INVITATIONS_PER_DAY } from './invitation-quota';
import { LoginEventsService } from './login-events.service';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('cerrar sesión invalida el token', () => {
  const actor = { id: 'u1', email: 'a@b.ec', role: Role.ADMIN, tenantId: 't1', name: 'Nombre' };

  it('logout guarda el jti hasta que el token caduca y limpia los ya caducados', async () => {
    const prisma = {
      revokedToken: { upsert: jest.fn().mockReturnValue('upsert'), deleteMany: jest.fn().mockReturnValue('clean') },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const service = new AuthService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await service.logout({ ...actor, jti: 'jti-1', tokenExp: 2_000_000_000 });
    expect(prisma.revokedToken.upsert).toHaveBeenCalledWith({
      where: { jti: 'jti-1' },
      create: { jti: 'jti-1', userId: 'u1', expiresAt: new Date(2_000_000_000 * 1000) },
      update: {},
    });
    expect(prisma.revokedToken.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: expect.any(Date) } } });
  });

  it('un token antiguo sin jti no rompe el cierre de sesión', async () => {
    const prisma = { revokedToken: { upsert: jest.fn() }, $transaction: jest.fn() };
    const service = new AuthService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.logout(actor)).resolves.toEqual({ ok: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  describe('JwtStrategy', () => {
    const user = { id: 'u1', email: 'a@b.ec', role: Role.ADMIN, tenantId: 't1', name: 'Nombre', passwordChangedAt: null };
    const make = (revoked: unknown) => {
      const prisma = {
        user: { findFirst: jest.fn().mockResolvedValue(user) },
        revokedToken: { findUnique: jest.fn().mockResolvedValue(revoked) },
      };
      const config = { getOrThrow: () => 'secreto-de-prueba' };
      return { prisma, strategy: new JwtStrategy(config as never, prisma as never) };
    };
    const payload = { sub: 'u1', email: 'a@b.ec', role: 'ADMIN', tenantId: 't1', name: 'Nombre', iat: 1, exp: 99, jti: 'jti-1' };

    it('token revocado → 401 aunque no haya caducado', async () => {
      const { strategy } = make({ jti: 'jti-1' });
      await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('token vigente: pasa y lleva su jti y caducidad para poder cerrarlo', async () => {
      const { strategy } = make(null);
      await expect(strategy.validate(payload)).resolves.toMatchObject({ id: 'u1', jti: 'jti-1', tokenExp: 99 });
    });

    it('token anterior a esta mejora (sin jti): sigue valiendo y no consulta la lista', async () => {
      const { prisma, strategy } = make(null);
      const { jti: _jti, ...old } = payload;
      await expect(strategy.validate(old)).resolves.toMatchObject({ id: 'u1' });
      expect(prisma.revokedToken.findUnique).not.toHaveBeenCalled();
    });
  });
});

describe('email sin confirmar (alta de una firma)', () => {
  it('con la contraseña correcta no entra: 403 y se reenvía el enlace', async () => {
    const passwordHash = await bcrypt.hash('demo1234', 4);
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1', slug: 'firma', requireTwoFactor: false }) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'nombre@firma.ec',
          active: true,
          emailVerified: false,
          passwordHash,
          role: Role.ADMIN,
        }),
      },
    };
    const tokens = { resendVerification: jest.fn().mockResolvedValue(true) };
    const loginEvents = { record: jest.fn(), recentPasswordFailures: jest.fn().mockResolvedValue({ count: 0, oldest: null }) };
    const jwt = { signAsync: jest.fn() };
    const service = new AuthService(prisma as never, jwt as never, tokens as never, loginEvents as never, {} as never, {} as never);

    const err = await service.login({ tenantSlug: 'firma', email: 'nombre@firma.ec', password: 'demo1234' }, {}).catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.getResponse().error).toEqual({ code: 'EMAIL_NOT_VERIFIED', emailHint: 'no••••@firma.ec' });
    expect(tokens.resendVerification).toHaveBeenCalledWith('u1');
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  describe('AccountTokensService', () => {
    const token = (type: UserTokenType, over = {}) => ({
      id: 'tk1',
      userId: 'u1',
      type,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1', name: 'Nombre', email: 'nombre@firma.ec', active: true, tenant: { name: 'Firma', slug: 'firma' } },
      ...over,
    });
    const make = (found: unknown) => {
      const prisma = {
        userToken: {
          findUnique: jest.fn().mockResolvedValue(found),
          findFirst: jest.fn().mockResolvedValue(null),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          deleteMany: jest.fn(),
          create: jest.fn(),
        },
        user: { update: jest.fn(), findUnique: jest.fn() },
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
      };
      const mail = { send: jest.fn() };
      const config = { get: (_k: string, d: unknown) => d };
      return { prisma, mail, service: new AccountTokensService(prisma as never, mail as never, config as never) };
    };
    const RAW = 'x'.repeat(43);

    it('verifyEmail consume el enlace y marca la cuenta como verificada', async () => {
      const { prisma, service } = make(token(UserTokenType.VERIFY));
      await expect(service.verifyEmail(RAW)).resolves.toMatchObject({ email: 'nombre@firma.ec', tenantSlug: 'firma' });
      expect(prisma.userToken.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: hashToken(RAW) } }));
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { emailVerified: true } });
    });

    it('cada enlace solo sirve para lo suyo', async () => {
      // Uno de recuperación no confirma el email…
      await expect(make(token(UserTokenType.RESET)).service.verifyEmail(RAW)).rejects.toThrow(/no es válido/);
      // …y uno de confirmación no sirve para fijar una contraseña
      await expect(make(token(UserTokenType.VERIFY)).service.setPassword(RAW, 'otra-clave-1')).rejects.toThrow(/no es válido/);
      await expect(make(token(UserTokenType.VERIFY)).service.info(RAW)).rejects.toThrow(/no es válido/);
    });

    it('fijar la contraseña desde un enlace del correo también verifica el email', async () => {
      const { prisma, service } = make(token(UserTokenType.RESET));
      await service.setPassword(RAW, 'otra-clave-1');
      expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ emailVerified: true });
    });

    it('el enlace de confirmación sale sin la identidad de la firma y lleva a /verificar', async () => {
      const { prisma, mail, service } = make(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Nombre',
        email: 'nombre@firma.ec',
        tenantId: 't1',
        tenant: { name: 'Firma', slug: 'firma' },
      });
      await expect(service.send('u1', UserTokenType.VERIFY)).resolves.toBe(true);
      const sent = mail.send.mock.calls[0][0];
      expect(sent.tenantId).toBeUndefined();
      expect(sent.text).toContain('http://localhost:3000/verificar?token=');
      expect(sent.subject).toContain('Confirma tu email');
    });

    it('no se reenvía si ya se envió uno hace menos de 2 minutos', async () => {
      const { prisma, mail, service } = make(null);
      prisma.userToken.findFirst.mockResolvedValue({ id: 'reciente' });
      await expect(service.resendVerification('u1')).resolves.toBe(false);
      expect(mail.send).not.toHaveBeenCalled();
      const since = prisma.userToken.findFirst.mock.calls[0][0].where.createdAt.gt as Date;
      expect(Date.now() - since.getTime()).toBeGreaterThanOrEqual(VERIFY_RESEND_COOLDOWN_MS - 1000);
    });
  });
});

describe('bloqueo por contraseñas fallidas: por IP', () => {
  const make = () => {
    const prisma = {
      loginEvent: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockReturnValue(0) },
      $transaction: jest.fn().mockResolvedValue([0, null]),
    };
    return { prisma, service: new LoginEventsService(prisma as never) };
  };

  it('con IP solo cuentan los fallos desde esa IP: un tercero no deja fuera al dueño', async () => {
    const { prisma, service } = make();
    await service.recentPasswordFailures('t1', 'a@b.ec', 60_000, '203.0.113.9');
    expect(prisma.loginEvent.count.mock.calls[0][0].where).toMatchObject({ tenantId: 't1', email: 'a@b.ec', ip: '203.0.113.9' });
  });

  it('sin IP conocida, cuentan todos (como antes)', async () => {
    const { prisma, service } = make();
    await service.recentPasswordFailures('t1', 'a@b.ec', 60_000, null);
    expect(prisma.loginEvent.count.mock.calls[0][0].where).not.toHaveProperty('ip');
  });
});

describe('tope de invitaciones por firma y día', () => {
  const make = (created: number, resent: number) => ({
    user: { count: jest.fn().mockResolvedValue(created) },
    activityEvent: { count: jest.fn().mockResolvedValue(resent) },
  });

  it('por debajo del tope pasa; contando solo la firma propia y las últimas 24 h', async () => {
    const prisma = make(10, 5);
    await expect(assertInvitationQuota(prisma as never, 't1')).resolves.toBeUndefined();
    expect(prisma.user.count.mock.calls[0][0].where).toMatchObject({ tenantId: 't1' });
    expect(prisma.activityEvent.count.mock.calls[0][0].where).toMatchObject({ tenantId: 't1', type: 'USER_INVITED' });
  });

  it('al llegar al tope: 429 con un mensaje claro', async () => {
    const err: HttpException = await assertInvitationQuota(make(INVITATIONS_PER_DAY - 2, 2) as never, 't1').catch((e) => e);
    expect(err.getStatus()).toBe(429);
    expect(String(err.getResponse())).toMatch(/máximo de 50 altas e invitaciones/);
  });
});
