import { HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  buildLoginCodeEmail,
  generateCode,
  hashCode,
  LOGIN_CODE,
  maskEmail,
  requiresTwoFactor,
  TwoFactorService,
} from './two-factor.service';

describe('utilidades del código de acceso', () => {
  it('maskEmail deja ver el principio y el dominio', () => {
    expect(maskEmail('abogado@demo.bogados')).toBe('ab•••••@demo.bogados');
    expect(maskEmail('al@x.com')).toBe('a•••@x.com');
  });

  it('generateCode: siempre 6 dígitos, también con ceros a la izquierda', () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('el hash depende del desafío: el mismo código en otro desafío no sirve', () => {
    expect(hashCode('a', '123456')).not.toBe(hashCode('b', '123456'));
  });

  it('requiresTwoFactor: la cuenta lo activa, o la firma lo exige al equipo (no a clientes)', () => {
    const off = { requireTwoFactor: false };
    const on = { requireTwoFactor: true };
    expect(requiresTwoFactor({ twoFactorEnabled: true, role: Role.CLIENTE }, off)).toBe(true);
    expect(requiresTwoFactor({ twoFactorEnabled: false, role: Role.ABOGADO }, on)).toBe(true);
    expect(requiresTwoFactor({ twoFactorEnabled: false, role: Role.CLIENTE }, on)).toBe(false);
    expect(requiresTwoFactor({ twoFactorEnabled: false, role: Role.ADMIN }, off)).toBe(false);
  });

  it('el email del código dice desde dónde se pidió y qué hacer si no fue uno', () => {
    const e = buildLoginCodeEmail({ name: 'Ana', tenantName: 'Firma <Demo>', code: '042917', device: 'Chrome en Windows', ip: '190.1.2.3' });
    expect(e.text).toContain('042 917');
    expect(e.text).toContain('Chrome en Windows · IP 190.1.2.3');
    expect(e.text).toContain('cámbiala');
    expect(e.html).toContain('Firma &#60;Demo&#62;');
  });
});

describe('TwoFactorService', () => {
  const user = {
    id: 'u1',
    tenantId: 't1',
    email: 'ana@demo.bogados',
    name: 'Ana',
    role: Role.ADMIN,
    active: true,
    tenant: { id: 't1', name: 'Firma Demo', requireTwoFactor: false },
  };
  let prisma: {
    loginChallenge: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let mail: { send: jest.Mock };
  let loginEvents: { record: jest.Mock };
  let service: TwoFactorService;
  /** Código que se envió en el último email */
  const sentCode = () => /(\d{3}) (\d{3})/.exec(mail.send.mock.calls.at(-1)[0].text)!.slice(1).join('');

  const challenge = (over: Record<string, unknown> = {}) => ({
    id: 'ch1',
    userId: 'u1',
    codeHash: hashCode('ch1', '123456'),
    remember: false,
    attempts: 0,
    sends: 1,
    expiresAt: new Date(Date.now() + 60_000),
    lastSentAt: new Date(Date.now() - 60_000),
    consumedAt: null,
    ip: '190.1.2.3',
    userAgent: 'Chrome',
    user,
    ...over,
  });

  beforeEach(() => {
    prisma = {
      loginChallenge: {
        deleteMany: jest.fn(),
        create: jest.fn(async ({ data }) => ({ ...data, lastSentAt: new Date() })),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(async ({ data }) => ({ ...challenge(), ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mail = { send: jest.fn() };
    loginEvents = { record: jest.fn() };
    service = new TwoFactorService(prisma as never, mail as never, loginEvents as never);
  });

  describe('start', () => {
    it('crea un desafío nuevo (anula los anteriores), guarda solo el hash y envía el código', async () => {
      const res = await service.start(user as never, user.tenant as never, { remember: true, ip: '1.1.1.1', userAgent: 'Firefox/1' });
      expect(prisma.loginChallenge.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', consumedAt: null } });
      const data = prisma.loginChallenge.create.mock.calls[0][0].data;
      expect(data.codeHash).toBe(hashCode(data.id, sentCode()));
      expect(JSON.stringify(data)).not.toContain(sentCode());
      expect(data.remember).toBe(true);
      expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@demo.bogados' }));
      expect(res).toMatchObject({ twoFactorRequired: true, challengeId: data.id, emailHint: 'an•••@demo.bogados' });
    });

    it('si el correo falla, borra el desafío y responde 503', async () => {
      mail.send.mockRejectedValue(new Error('SMTP caído'));
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      await expect(service.start(user as never, user.tenant as never, { remember: false })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(prisma.loginChallenge.delete).toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('código correcto: consume el desafío una sola vez', async () => {
      prisma.loginChallenge.findUnique.mockResolvedValue(challenge());
      await expect(service.verify('ch1', '123456')).resolves.toMatchObject({ id: 'ch1' });
      expect(prisma.loginChallenge.updateMany).toHaveBeenCalledWith({
        where: { id: 'ch1', consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('dos verificaciones a la vez: la segunda no abre otra sesión', async () => {
      prisma.loginChallenge.findUnique.mockResolvedValue(challenge());
      prisma.loginChallenge.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.verify('ch1', '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    /**
     * Base de datos simulada con estado: findUnique devuelve el desafío actual y updateMany aplica
     * la condición (no consumido y con intentos libres) como lo haría PostgreSQL, fila a fila.
     */
    function statefulChallenge(initial: Record<string, unknown>) {
      const row = challenge(initial) as ReturnType<typeof challenge> & { attempts: number; consumedAt: Date | null };
      prisma.loginChallenge.findUnique.mockImplementation(async () => ({ ...row }));
      prisma.loginChallenge.updateMany.mockImplementation(async ({ where, data }) => {
        if (row.consumedAt) return { count: 0 };
        if (where.attempts?.lt !== undefined && !(row.attempts < where.attempts.lt)) return { count: 0 };
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
        if (data.consumedAt) row.consumedAt = data.consumedAt;
        return { count: 1 };
      });
      return row;
    }

    it('código incorrecto: descuenta un intento, lo registra y dice cuántos quedan', async () => {
      const row = statefulChallenge({ attempts: 1 });
      const err = await service.verify('ch1', '000000').catch((e) => e);
      expect(err.getResponse()).toEqual({
        message: 'El código no es correcto. Te quedan 3 intentos.',
        error: { code: 'BAD_CODE', remainingAttempts: 3 },
      });
      expect(row.attempts).toBe(2);
      expect(loginEvents.record).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, reason: 'bad_code', userId: 'u1', ip: '190.1.2.3' }),
      );
    });

    it('el último intento fallido cierra el desafío', async () => {
      const row = statefulChallenge({ attempts: LOGIN_CODE.maxAttempts - 1 });
      const err = await service.verify('ch1', '000000').catch((e) => e);
      expect(err.getResponse().error.code).toBe('CHALLENGE_INVALID');
      expect(row.consumedAt).toBeInstanceOf(Date);
    });

    it('muchas verificaciones a la vez: solo maxAttempts llegan a comparar el código', async () => {
      const row = statefulChallenge({ attempts: 0 });
      const codes = Array.from({ length: 20 }, (_, i) => String(100000 + i)); // ninguno es 123456
      const results = await Promise.all(codes.map((c) => service.verify('ch1', c).catch((e) => e)));
      const compared = results.filter((e) => e.getResponse?.().error?.code === 'BAD_CODE').length;
      expect(compared).toBeLessThanOrEqual(LOGIN_CODE.maxAttempts);
      expect(row.attempts).toBe(LOGIN_CODE.maxAttempts);
      expect(loginEvents.record).toHaveBeenCalledTimes(LOGIN_CODE.maxAttempts);
      // Aunque después llegue el código correcto, el desafío ya no sirve
      const late = await service.verify('ch1', '123456').catch((e) => e);
      expect(late.getResponse().error.code).toBe('CHALLENGE_INVALID');
    });

    it('código caducado: lo dice y lo registra, aunque el código sea el correcto', async () => {
      prisma.loginChallenge.findUnique.mockResolvedValue(challenge({ expiresAt: new Date(Date.now() - 1) }));
      const err = await service.verify('ch1', '123456').catch((e) => e);
      expect(err.getResponse().error.code).toBe('CODE_EXPIRED');
      expect(loginEvents.record).toHaveBeenCalledWith(expect.objectContaining({ reason: 'expired_code' }));
    });

    it.each([
      ['inexistente', null],
      ['ya usado', challenge({ consumedAt: new Date() })],
      ['cuenta desactivada', challenge({ user: { ...user, active: false } })],
    ])('desafío %s → vuelve a iniciar sesión', async (_caso, row) => {
      prisma.loginChallenge.findUnique.mockResolvedValue(row);
      const err = await service.verify('ch1', '123456').catch((e) => e);
      expect(err.getResponse().error.code).toBe('CHALLENGE_INVALID');
    });
  });

  describe('resend', () => {
    it('envía un código nuevo; el anterior deja de valer', async () => {
      prisma.loginChallenge.findUnique.mockResolvedValue(challenge());
      await service.resend('ch1');
      const data = prisma.loginChallenge.update.mock.calls[0][0].data;
      expect(data.codeHash).toBe(hashCode('ch1', sentCode()));
      expect(data.codeHash).not.toBe(hashCode('ch1', '123456'));
      expect(data.sends).toEqual({ increment: 1 });
    });

    it('antes de 30 s: 429 con los segundos que faltan', async () => {
      prisma.loginChallenge.findUnique.mockResolvedValue(challenge({ lastSentAt: new Date(Date.now() - 10_000) }));
      const err: HttpException = await service.resend('ch1').catch((e) => e);
      expect(err.getStatus()).toBe(429);
      expect((err.getResponse() as { error: { code: string; retryAfterSeconds: number } }).error).toEqual({
        code: 'RESEND_TOO_SOON',
        retryAfterSeconds: 20,
      });
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('tope de envíos por desafío', async () => {
      prisma.loginChallenge.findUnique.mockResolvedValue(challenge({ sends: LOGIN_CODE.maxSends }));
      const err: HttpException = await service.resend('ch1').catch((e) => e);
      expect((err.getResponse() as { error: { code: string } }).error.code).toBe('TOO_MANY_SENDS');
    });
  });
});
