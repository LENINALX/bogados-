import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserTokenType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../common/utils/html';

export const TOKEN_TTL_MS: Record<UserTokenType, number> = {
  INVITE: 7 * 24 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
  VERIFY: 24 * 60 * 60 * 1000,
};

/** No se reenvía el enlace de confirmación más de una vez en este tiempo. */
export const VERIFY_RESEND_COOLDOWN_MS = 2 * 60_000;

export const INVALID_TOKEN_MESSAGE =
  'El enlace no es válido o ha caducado. Pide uno nuevo.';

/** En BD solo se guarda el hash: una fuga de la tabla no permite usar los enlaces. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Hash de una contraseña que nadie conoce: la cuenta no puede entrar hasta activarse. */
export function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString('hex'), 10);
}

type EmailData = { name: string; tenantName: string; tenantSlug: string; link: string };

function buildEmail(type: UserTokenType, d: EmailData, invitedBy?: string) {
  const invite = type === UserTokenType.INVITE;
  const subject = invite
    ? `Invitación a ${d.tenantName} en Bogados`
    : 'Restablece tu contraseña de Bogados';
  const intro = invite
    ? `${invitedBy ?? 'Tu firma'} te ha invitado a ${d.tenantName} en Bogados. Define tu contraseña para entrar:`
    : `Recibimos una solicitud para restablecer tu contraseña en ${d.tenantName}. Si no fuiste tú, ignora este mensaje.`;
  const validity = invite ? 'El enlace caduca en 7 días.' : 'El enlace caduca en 1 hora.';
  const firmLine = `Al iniciar sesión, usa el código de firma: ${d.tenantSlug}`;

  const text = [`Hola ${d.name},`, '', intro, d.link, '', validity, firmLine].join('\n');
  const html = `
    <p>Hola ${escapeHtml(d.name)},</p>
    <p>${escapeHtml(intro)}</p>
    <p><a href="${escapeHtml(d.link)}" style="display:inline-block;padding:10px 18px;background:#1f3d38;color:#fff;border-radius:8px;text-decoration:none">
      ${invite ? 'Activar mi cuenta' : 'Restablecer contraseña'}</a></p>
    <p style="color:#555;font-size:13px">${escapeHtml(validity)}<br>${escapeHtml(firmLine)}</p>
    <p style="color:#888;font-size:12px">Si el botón no funciona, copia este enlace: ${escapeHtml(d.link)}</p>`;
  return { subject, text, html };
}

/** Confirmación del email de quien registra una firma: hasta entonces no puede entrar. */
export function buildVerifyEmail(d: EmailData) {
  const intro = `Has registrado ${d.tenantName} en Bogados. Confirma que este email es tuyo para activar la cuenta:`;
  const validity = 'El enlace caduca en 24 horas. Si no fuiste tú, ignora este mensaje: la cuenta no se activará.';
  const firmLine = `Código de firma (lo necesitáis tú y tu equipo para iniciar sesión): ${d.tenantSlug}`;
  const text = [`Hola ${d.name},`, '', intro, d.link, '', validity, firmLine].join('\n');
  const html = `
    <p>Hola ${escapeHtml(d.name)},</p>
    <p>${escapeHtml(intro)}</p>
    <p><a href="${escapeHtml(d.link)}" style="display:inline-block;padding:10px 18px;background:#1f3d38;color:#fff;border-radius:8px;text-decoration:none">Confirmar mi email</a></p>
    <p style="color:#555;font-size:13px">${escapeHtml(validity)}<br>${escapeHtml(firmLine)}</p>
    <p style="color:#888;font-size:12px">Si el botón no funciona, copia este enlace: ${escapeHtml(d.link)}</p>`;
  return { subject: `Confirma tu email para activar ${d.tenantName} en Bogados`, text, html };
}

@Injectable()
export class AccountTokensService {
  private readonly logger = new Logger('AccountTokens');
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
  }

  /** Crea un enlace nuevo y borra los pendientes del mismo tipo (solo vale el último). */
  async issue(
    userId: string,
    type: UserTokenType,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await db.userToken.deleteMany({ where: { userId, type, usedAt: null } });
    await db.userToken.create({
      data: {
        userId,
        type,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
      },
    });
    return raw;
  }

  /**
   * Genera el enlace y lo envía por email. Devuelve si se envió: un fallo de
   * correo no debe deshacer la creación del usuario (se puede reenviar).
   */
  async send(userId: string, type: UserTokenType, invitedBy?: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { select: { name: true, slug: true } } },
    });
    if (!user) return false;
    try {
      const raw = await this.issue(userId, type);
      const data = { name: user.name, tenantName: user.tenant.name, tenantSlug: user.tenant.slug };
      if (type === UserTokenType.VERIFY) {
        const link = `${this.appUrl}/verificar?token=${encodeURIComponent(raw)}`;
        // Sin tenantId: una firma sin verificar aún no envía correo con su nombre, logo ni contacto
        await this.mail.send({ to: user.email, ...buildVerifyEmail({ ...data, link }) });
        return true;
      }
      const link = `${this.appUrl}/restablecer?token=${encodeURIComponent(raw)}`;
      const email = buildEmail(type, { ...data, link }, invitedBy);
      await this.mail.send({ to: user.email, ...email, tenantId: user.tenantId });
      return true;
    } catch (err) {
      this.logger.error(
        `No se pudo enviar ${type} a ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
      return false;
    }
  }

  /** Reenvía el enlace de confirmación, salvo que se haya enviado uno hace muy poco. */
  async resendVerification(userId: string): Promise<boolean> {
    const recent = await this.prisma.userToken.findFirst({
      where: {
        userId,
        type: UserTokenType.VERIFY,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - VERIFY_RESEND_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) return false;
    return this.send(userId, UserTokenType.VERIFY);
  }

  /** Consume el enlace de confirmación: la cuenta ya puede entrar. */
  async verifyEmail(raw: string) {
    const t = await this.findValid(raw, [UserTokenType.VERIFY]);
    if (!t) throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.userToken.updateMany({
        where: { id: t.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (count === 0) throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      await tx.user.update({ where: { id: t.userId }, data: { emailVerified: true } });
    });
    return { name: t.user.name, email: t.user.email, tenantSlug: t.user.tenant.slug, tenantName: t.user.tenant.name };
  }

  /** `types`: cada pantalla solo acepta sus enlaces (uno de confirmación no sirve para fijar una contraseña). */
  private async findValid(raw: string, types: UserTokenType[] = [UserTokenType.INVITE, UserTokenType.RESET]) {
    if (!raw) return null;
    const token = await this.prisma.userToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { user: { include: { tenant: { select: { name: true, slug: true } } } } },
    });
    if (!token || !types.includes(token.type) || token.usedAt || token.expiresAt <= new Date() || !token.user.active) {
      return null;
    }
    return token;
  }

  /** Datos para la pantalla de "define tu contraseña". */
  async info(raw: string) {
    const t = await this.findValid(raw);
    if (!t) throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    return {
      type: t.type,
      name: t.user.name,
      email: t.user.email,
      tenantName: t.user.tenant.name,
      tenantSlug: t.user.tenant.slug,
      expiresAt: t.expiresAt,
    };
  }

  /** Consume el enlace y fija la contraseña. Invalida sesiones y otros enlaces. */
  async setPassword(raw: string, password: string) {
    const t = await this.findValid(raw);
    if (!t) throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Condicional: si el mismo enlace se usa dos veces a la vez, solo una gana
      const { count } = await tx.userToken.updateMany({
        where: { id: t.id, usedAt: null },
        data: { usedAt: now },
      });
      if (count === 0) throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      await tx.user.update({
        where: { id: t.userId },
        // Llegar aquí demuestra que el email es suyo: también queda verificado
        data: { passwordHash, passwordChangedAt: now, emailVerified: true },
      });
      await tx.userToken.deleteMany({ where: { userId: t.userId, usedAt: null } });
    });

    return { email: t.user.email, tenantSlug: t.user.tenant.slug };
  }
}
