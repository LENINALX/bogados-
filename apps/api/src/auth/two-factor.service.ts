import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, Tenant, User } from '@prisma/client';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../common/utils/html';
import { ClientMeta, describeUserAgent } from './client-meta';
import { LoginEventsService } from './login-events.service';

export const LOGIN_CODE = {
  ttlMs: 10 * 60_000,
  /** Intentos por desafío: pedir otro código no los reinicia */
  maxAttempts: 5,
  resendCooldownMs: 30_000,
  maxSends: 4,
} as const;

/** Lo que la web necesita para pedir el código. */
export type TwoFactorChallenge = {
  twoFactorRequired: true;
  challengeId: string;
  emailHint: string;
  expiresAt: string;
  resendAvailableAt: string;
};

/** El equipo puede estar obligado por la firma; el cliente solo si la activa él. */
export function requiresTwoFactor(
  user: Pick<User, 'twoFactorEnabled' | 'role'>,
  tenant: Pick<Tenant, 'requireTwoFactor'>,
): boolean {
  return user.twoFactorEnabled || (tenant.requireTwoFactor && user.role !== Role.CLIENTE);
}

/** «ab•••••@demo.bogados»: confirma a qué correo fue sin revelarlo entero. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Con el id como sal: el mismo código en dos desafíos no da el mismo hash. */
export function hashCode(challengeId: string, code: string): string {
  return createHash('sha256').update(`${challengeId}:${code}`).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

export function buildLoginCodeEmail(d: {
  name: string;
  tenantName: string;
  code: string;
  device: string;
  ip?: string | null;
}) {
  const spaced = `${d.code.slice(0, 3)} ${d.code.slice(3)}`;
  const minutes = LOGIN_CODE.ttlMs / 60_000;
  const origin = `${d.device}${d.ip ? ` · IP ${d.ip}` : ''}`;
  const text = [
    `Hola ${d.name},`,
    '',
    `Tu código para entrar en ${d.tenantName} es: ${spaced}`,
    '',
    `Caduca en ${minutes} minutos. Desde: ${origin}.`,
    'Si no has intentado entrar, alguien conoce tu contraseña: cámbiala cuanto antes y avisa a tu firma.',
  ].join('\n');
  const html = `
    <p>Hola ${escapeHtml(d.name)},</p>
    <p>Tu código para entrar en <strong>${escapeHtml(d.tenantName)}</strong> es:</p>
    <p style="margin:20px 0;font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,Consolas,monospace;color:#1f3d38">${escapeHtml(spaced)}</p>
    <p style="color:#555;font-size:13px">Caduca en ${minutes} minutos. Desde: ${escapeHtml(origin)}.</p>
    <p style="color:#9c4a3c;font-size:13px">Si no has intentado entrar, alguien conoce tu contraseña: cámbiala cuanto antes y avisa a tu firma.</p>
    <p style="color:#888;font-size:12px">${escapeHtml(d.tenantName)} · Bogados</p>`;
  return { subject: `Tu código de acceso a ${d.tenantName}`, text, html };
}

function invalidChallenge(message = 'La verificación ya no es válida. Vuelve a iniciar sesión.'): never {
  throw new UnauthorizedException({ message, error: { code: 'CHALLENGE_INVALID' } });
}

/** Segundo paso del acceso: un código de 6 dígitos enviado al email de la cuenta. */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactor');

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private loginEvents: LoginEventsService,
  ) {}

  async start(
    user: User,
    tenant: Tenant,
    opts: ClientMeta & { remember: boolean },
  ): Promise<TwoFactorChallenge> {
    const id = randomUUID();
    const code = generateCode();
    const now = Date.now();
    // Solo vale el último desafío de cada usuario
    await this.prisma.loginChallenge.deleteMany({ where: { userId: user.id, consumedAt: null } });
    const challenge = await this.prisma.loginChallenge.create({
      data: {
        id,
        userId: user.id,
        codeHash: hashCode(id, code),
        remember: opts.remember,
        expiresAt: new Date(now + LOGIN_CODE.ttlMs),
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
    try {
      await this.sendCode(user, tenant.name, code, opts);
    } catch (err) {
      await this.prisma.loginChallenge.delete({ where: { id } }).catch(() => undefined);
      this.logger.error(`No se pudo enviar el código de acceso a ${user.email}`, err instanceof Error ? err.stack : String(err));
      throw new ServiceUnavailableException('No pudimos enviarte el código de acceso. Inténtalo de nuevo en unos minutos.');
    }
    return this.describe(challenge.id, user.email, challenge.expiresAt, challenge.lastSentAt);
  }

  /** Devuelve el desafío ya consumido si el código es correcto; si no, lanza y lo registra. */
  async verify(challengeId: string, code: string) {
    const challenge = await this.prisma.loginChallenge.findUnique({
      where: { id: challengeId },
      include: { user: { include: { tenant: true } } },
    });
    if (!challenge || challenge.consumedAt || !challenge.user.active) invalidChallenge();
    const { user } = challenge;
    const fail = (reason: 'bad_code' | 'expired_code') =>
      this.loginEvents.record({
        tenantId: user.tenantId,
        userId: user.id,
        email: user.email,
        success: false,
        reason,
        ip: challenge.ip,
        userAgent: challenge.userAgent,
      });

    if (challenge.attempts >= LOGIN_CODE.maxAttempts) {
      invalidChallenge('Has agotado los intentos. Vuelve a iniciar sesión para recibir un código nuevo.');
    }
    if (challenge.expiresAt.getTime() <= Date.now()) {
      await fail('expired_code');
      throw new UnauthorizedException({
        message: 'El código ha caducado. Pide uno nuevo.',
        error: { code: 'CODE_EXPIRED' },
      });
    }

    if (!sameHash(challenge.codeHash, hashCode(challenge.id, code))) {
      const attempts = challenge.attempts + 1;
      const remaining = Math.max(0, LOGIN_CODE.maxAttempts - attempts);
      await this.prisma.loginChallenge.update({
        where: { id: challenge.id },
        // Sin intentos, el desafío se cierra: hay que volver a poner la contraseña
        data: { attempts, ...(remaining === 0 ? { consumedAt: new Date() } : {}) },
      });
      await fail('bad_code');
      if (remaining === 0) {
        invalidChallenge('Has agotado los intentos. Vuelve a iniciar sesión para recibir un código nuevo.');
      }
      throw new UnauthorizedException({
        message: `El código no es correcto. Te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`,
        error: { code: 'BAD_CODE', remainingAttempts: remaining },
      });
    }

    // Condicional: dos verificaciones simultáneas con el mismo código no abren dos sesiones
    const { count } = await this.prisma.loginChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (count === 0) invalidChallenge();
    return challenge;
  }

  async resend(challengeId: string): Promise<TwoFactorChallenge> {
    const challenge = await this.prisma.loginChallenge.findUnique({
      where: { id: challengeId },
      include: { user: { include: { tenant: true } } },
    });
    if (!challenge || challenge.consumedAt || !challenge.user.active || challenge.attempts >= LOGIN_CODE.maxAttempts) {
      invalidChallenge();
    }
    const wait = challenge.lastSentAt.getTime() + LOGIN_CODE.resendCooldownMs - Date.now();
    if (wait > 0) {
      throw new HttpException(
        {
          message: `Espera ${Math.ceil(wait / 1000)} segundos para pedir otro código.`,
          error: { code: 'RESEND_TOO_SOON', retryAfterSeconds: Math.ceil(wait / 1000) },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (challenge.sends >= LOGIN_CODE.maxSends) {
      throw new HttpException(
        {
          message: 'Has pedido demasiados códigos. Vuelve a iniciar sesión.',
          error: { code: 'TOO_MANY_SENDS' },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateCode();
    const now = new Date();
    const updated = await this.prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: {
        codeHash: hashCode(challenge.id, code),
        expiresAt: new Date(now.getTime() + LOGIN_CODE.ttlMs),
        lastSentAt: now,
        sends: { increment: 1 },
      },
    });
    await this.sendCode(challenge.user, challenge.user.tenant.name, code, challenge);
    return this.describe(updated.id, challenge.user.email, updated.expiresAt, updated.lastSentAt);
  }

  private sendCode(user: User, tenantName: string, code: string, meta: ClientMeta) {
    const email = buildLoginCodeEmail({
      name: user.name,
      tenantName,
      code,
      device: describeUserAgent(meta.userAgent),
      ip: meta.ip,
    });
    return this.mail.send({ to: user.email, ...email });
  }

  private describe(id: string, email: string, expiresAt: Date, lastSentAt: Date): TwoFactorChallenge {
    return {
      twoFactorRequired: true,
      challengeId: id,
      emailHint: maskEmail(email),
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(lastSentAt.getTime() + LOGIN_CODE.resendCooldownMs).toISOString(),
    };
  }
}
