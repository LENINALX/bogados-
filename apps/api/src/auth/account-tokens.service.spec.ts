import { BadRequestException, Logger } from '@nestjs/common';
import { UserTokenType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AccountTokensService, hashToken, TOKEN_TTL_MS } from './account-tokens.service';
import { issuedBeforePasswordChange } from './strategies/jwt.strategy';

type Token = {
  id: string;
  userId: string;
  type: UserTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

/** Prisma en memoria con lo justo que usa el servicio. */
function fakeDb() {
  const tokens: Token[] = [];
  const users = new Map([
    [
      'u1',
      {
        id: 'u1',
        email: 'ana@firma.com',
        name: 'Ana <Admin>',
        active: true,
        passwordHash: 'hash-anterior',
        passwordChangedAt: null as Date | null,
        tenant: { name: 'Firma Demo', slug: 'firma-demo' },
      },
    ],
  ]);
  const matches = (t: Token, where: Partial<Token>) =>
    Object.entries(where).every(([k, v]) => t[k as keyof Token] === v);

  const prisma = {
    userToken: {
      deleteMany: jest.fn(async ({ where }: { where: Partial<Token> }) => {
        const keep = tokens.filter((t) => !matches(t, where));
        tokens.splice(0, tokens.length, ...keep);
      }),
      create: jest.fn(async ({ data }: { data: Omit<Token, 'id' | 'usedAt'> }) => {
        tokens.push({ id: `t${tokens.length + 1}`, usedAt: null, ...data });
      }),
      findUnique: jest.fn(async ({ where }: { where: { tokenHash: string } }) => {
        const t = tokens.find((x) => x.tokenHash === where.tokenHash);
        return t ? { ...t, user: users.get(t.userId) } : null;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: Partial<Token>; data: Partial<Token> }) => {
        const t = tokens.find((x) => matches(x, where));
        if (!t) return { count: 0 };
        Object.assign(t, data);
        return { count: 1 };
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: object }) =>
        Object.assign(users.get(where.id)!, data),
      ),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return { prisma, tokens, users };
}

describe('AccountTokensService', () => {
  let db: ReturnType<typeof fakeDb>;
  let mail: { send: jest.Mock };
  let service: AccountTokensService;

  beforeEach(() => {
    db = fakeDb();
    mail = { send: jest.fn() };
    const config = { get: (k: string, d?: string) => (k === 'appUrl' ? 'https://app.test' : d) };
    service = new AccountTokensService(db.prisma as never, mail as never, config as never);
  });

  /** Envía y devuelve el token que viaja en el enlace del email. */
  async function sendAndGetToken(type: UserTokenType = UserTokenType.INVITE) {
    await service.send('u1', type, 'Luis');
    const text: string = mail.send.mock.calls.at(-1)[0].text;
    return decodeURIComponent(text.match(/token=([^\s]+)/)![1]);
  }

  describe('issue / send', () => {
    it('guarda solo el hash del token, con la caducidad de su tipo', async () => {
      const raw = await service.issue('u1', UserTokenType.RESET);
      expect(db.tokens).toHaveLength(1);
      expect(db.tokens[0].tokenHash).toBe(hashToken(raw));
      expect(db.tokens[0].tokenHash).not.toContain(raw);
      const ttl = db.tokens[0].expiresAt.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(TOKEN_TTL_MS.RESET - 5000);
      expect(ttl).toBeLessThanOrEqual(TOKEN_TTL_MS.RESET);
    });

    it('un enlace nuevo invalida los pendientes del mismo tipo', async () => {
      const first = await service.issue('u1', UserTokenType.INVITE);
      await service.issue('u1', UserTokenType.INVITE);
      expect(db.tokens).toHaveLength(1);
      await expect(service.info(first)).rejects.toThrow(BadRequestException);
    });

    it('el email lleva enlace, nombre de la firma y código de firma; el HTML escapa el nombre', async () => {
      await expect(service.send('u1', UserTokenType.INVITE, 'Luis')).resolves.toBe(true);
      const msg = mail.send.mock.calls[0][0];
      expect(msg.to).toBe('ana@firma.com');
      expect(msg.subject).toContain('Firma Demo');
      expect(msg.text).toContain('https://app.test/restablecer?token=');
      expect(msg.text).toContain('firma-demo');
      expect(msg.text).toContain('Luis te ha invitado');
      expect(msg.html).toContain('Ana &#60;Admin&#62;');
      expect(msg.html).not.toContain('<Admin>');
    });

    it('si el correo falla devuelve false (no lanza) y lo registra', async () => {
      const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      mail.send.mockRejectedValueOnce(new Error('SMTP caído'));
      await expect(service.send('u1', UserTokenType.RESET)).resolves.toBe(false);
      expect(logError).toHaveBeenCalled();
      logError.mockRestore();
    });
  });

  describe('info / setPassword', () => {
    it('info devuelve los datos del enlace vigente', async () => {
      const raw = await sendAndGetToken();
      await expect(service.info(raw)).resolves.toMatchObject({
        type: 'INVITE',
        email: 'ana@firma.com',
        tenantSlug: 'firma-demo',
      });
    });

    it('fija la contraseña, marca passwordChangedAt y el enlace no se puede reutilizar', async () => {
      const raw = await sendAndGetToken(UserTokenType.RESET);
      await expect(service.setPassword(raw, 'nueva-clave-segura')).resolves.toEqual({
        email: 'ana@firma.com',
        tenantSlug: 'firma-demo',
      });
      const user = db.users.get('u1')!;
      expect(await bcrypt.compare('nueva-clave-segura', user.passwordHash)).toBe(true);
      expect(user.passwordChangedAt).toBeInstanceOf(Date);

      await expect(service.setPassword(raw, 'otra-clave-123')).rejects.toThrow(BadRequestException);
    });

    it('usar un enlace borra los demás pendientes del usuario', async () => {
      const invite = await sendAndGetToken(UserTokenType.INVITE);
      const reset = await sendAndGetToken(UserTokenType.RESET);
      await service.setPassword(reset, 'nueva-clave-segura');
      await expect(service.info(invite)).rejects.toThrow(BadRequestException);
    });

    it('enlace caducado → 400', async () => {
      const raw = await sendAndGetToken(UserTokenType.RESET);
      db.tokens[0].expiresAt = new Date(Date.now() - 1000);
      await expect(service.setPassword(raw, 'nueva-clave-segura')).rejects.toThrow(BadRequestException);
    });

    it('usuario desactivado → 400', async () => {
      const raw = await sendAndGetToken();
      db.users.get('u1')!.active = false;
      await expect(service.info(raw)).rejects.toThrow(BadRequestException);
    });

    it.each(['', 'token-inventado-que-no-existe-en-la-bd'])('token "%s" → 400', async (raw) => {
      await expect(service.info(raw)).rejects.toThrow(BadRequestException);
    });
  });
});

describe('issuedBeforePasswordChange', () => {
  const changedAt = new Date('2026-09-29T10:00:00.500Z');
  const secs = Math.floor(changedAt.getTime() / 1000);

  it('sin cambio de contraseña, todo token vale', () => {
    expect(issuedBeforePasswordChange(1, null)).toBe(false);
  });

  it('token emitido antes del cambio → inválido', () => {
    expect(issuedBeforePasswordChange(secs - 1, changedAt)).toBe(true);
  });

  it('token emitido en el mismo segundo o después → válido', () => {
    expect(issuedBeforePasswordChange(secs, changedAt)).toBe(false);
    expect(issuedBeforePasswordChange(secs + 60, changedAt)).toBe(false);
  });

  it('token sin iat con contraseña cambiada → inválido', () => {
    expect(issuedBeforePasswordChange(undefined, changedAt)).toBe(true);
  });
});
