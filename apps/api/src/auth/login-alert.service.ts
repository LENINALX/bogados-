import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Tenant, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml } from '../common/utils/html';
import { ClientMeta, describeUserAgent } from './client-meta';

export const LOGIN_ALERT = {
  /** Un navegador usado en este periodo se da por conocido */
  lookbackMs: 180 * 24 * 60 * 60_000,
  /** Navegadores distintos que se miran como mucho */
  maxKnown: 100,
} as const;

export function buildNewLoginEmail(d: {
  name: string;
  tenantName: string;
  device: string;
  ip?: string | null;
  at: Date;
  timeZone: string;
  securityUrl: string;
}) {
  const when = new Intl.DateTimeFormat('es-EC', { timeZone: d.timeZone, dateStyle: 'full', timeStyle: 'short' }).format(d.at);
  const origin = `${d.device}${d.ip ? ` · IP ${d.ip}` : ''}`;
  const text = [
    `Hola ${d.name},`,
    '',
    `Se ha entrado en tu cuenta de ${d.tenantName} desde un navegador que no habías usado:`,
    '',
    `${origin}`,
    `${when}`,
    '',
    'Si fuiste tú, no hace falta que hagas nada.',
    `Si no, cambia tu contraseña ahora (se cerrarán las demás sesiones) y activa el código por email: ${d.securityUrl}`,
  ].join('\n');
  const html = `
    <p>Hola ${escapeHtml(d.name)},</p>
    <p>Se ha entrado en tu cuenta de <strong>${escapeHtml(d.tenantName)}</strong> desde un navegador que no habías usado:</p>
    <div style="margin:16px 0;padding:14px 16px;border:1px solid #d9d4c7;border-radius:10px;background:#faf8f3">
      <p style="margin:0;font-weight:600;color:#1f3d38">${escapeHtml(origin)}</p>
      <p style="margin:4px 0 0;color:#555;font-size:13px">${escapeHtml(when)}</p>
    </div>
    <p>Si fuiste tú, no hace falta que hagas nada.</p>
    <p style="color:#9c4a3c">Si no, cambia tu contraseña ahora (se cerrarán las demás sesiones) y activa el código por email.</p>
    <p><a href="${escapeHtml(d.securityUrl)}" style="display:inline-block;padding:10px 18px;background:#1f3d38;color:#fff;border-radius:8px;text-decoration:none">Revisar la seguridad de mi cuenta</a></p>
    <p style="color:#888;font-size:12px">${escapeHtml(d.tenantName)} · Bogados</p>`;
  return { subject: `Nuevo inicio de sesión en ${d.tenantName}`, text, html };
}

/** Aviso por email cuando alguien entra en una cuenta desde un navegador que no se había usado. */
@Injectable()
export class LoginAlertService {
  private readonly logger = new Logger('LoginAlert');
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
  }

  /**
   * Se compara «navegador en sistema» y no el user-agent exacto, que cambia con cada
   * actualización del navegador. El primer acceso de una cuenta no avisa: no hay con qué comparar.
   * Llamar antes de registrar el acceso actual.
   */
  async isNewDevice(userId: string, userAgent: string | null | undefined): Promise<boolean> {
    const rows = await this.prisma.loginEvent.findMany({
      where: { userId, success: true, createdAt: { gte: new Date(Date.now() - LOGIN_ALERT.lookbackMs) } },
      distinct: ['userAgent'],
      select: { userAgent: true },
      orderBy: { createdAt: 'desc' },
      take: LOGIN_ALERT.maxKnown,
    });
    if (!rows.length) return false;
    const device = describeUserAgent(userAgent);
    return !rows.some((r) => describeUserAgent(r.userAgent) === device);
  }

  /** No lanza: un fallo del correo no debe impedir entrar. */
  async send(
    user: Pick<User, 'email' | 'name'>,
    tenant: Pick<Tenant, 'id' | 'name' | 'timezone'>,
    meta: ClientMeta,
    at: Date,
  ) {
    try {
      const email = buildNewLoginEmail({
        name: user.name,
        tenantName: tenant.name,
        device: describeUserAgent(meta.userAgent),
        ip: meta.ip,
        at,
        timeZone: tenant.timezone,
        securityUrl: `${this.appUrl}/cuenta/seguridad`,
      });
      await this.mail.send({ to: user.email, ...email, tenantId: tenant.id });
    } catch (err) {
      this.logger.warn(`No se pudo enviar el aviso de inicio de sesión a ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
