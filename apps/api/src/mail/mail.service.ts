import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { escapeHtml } from '../common/utils/html';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Firma que envía: el email sale con su logo, su color, su contacto y responde a su email */
  tenantId?: string;
};

/** Color con el que se escriben las plantillas; se sustituye por el de la firma. */
export const BOGADOS_BRAND = '#1f3d38';

export type FirmBranding = {
  name: string;
  slug: string;
  brandColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  /** Versión del logo para la URL; null si no tiene */
  logoVersion: number | null;
};

/**
 * Aplica la identidad de la firma a un email ya construido: color de marca, logo arriba y
 * datos de contacto abajo. Las plantillas no cambian: escriben con BOGADOS_BRAND.
 */
export function brandEmail(msg: { text: string; html: string }, firm: FirmBranding, appUrl: string) {
  let html = firm.brandColor ? msg.html.split(BOGADOS_BRAND).join(firm.brandColor) : msg.html;
  if (firm.logoVersion) {
    const src = `${appUrl}/api/firmas/${encodeURIComponent(firm.slug)}/logo?v=${firm.logoVersion}`;
    html = `<p style="margin:0 0 16px"><img src="${escapeHtml(src)}" alt="${escapeHtml(firm.name)}" height="40" style="height:40px;max-width:200px;object-fit:contain"></p>${html}`;
  }
  const lines = [firm.contactEmail, firm.contactPhone, firm.address, firm.website].filter((v): v is string => Boolean(v));
  if (!lines.length) return { text: msg.text, html };
  const text = `${msg.text}\n\n—\n${firm.name}\n${lines.join('\n')}`;
  html += `
    <p style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e2da;color:#666;font-size:12px;line-height:1.6">
      <strong style="color:#333">${escapeHtml(firm.name)}</strong><br>${lines.map((l) => escapeHtml(l)).join('<br>')}
    </p>`;
  return { text, html };
}

/** «Bogados <no-reply@x>» → no-reply@x */
function addressOf(from: string): string {
  return /<([^>]+)>/.exec(from)?.[1] ?? from;
}

/**
 * Envío de correo por SMTP (SMTP_URL). Sin SMTP_URL:
 * - en desarrollo el mensaje se escribe en el log (con el enlace), para probar sin servidor;
 * - en producción se rechaza el envío: nunca se escriben enlaces de acceso en los logs.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly production: boolean;
  private readonly appUrl: string;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const smtpUrl = config.get<string>('mail.smtpUrl', '');
    this.from = config.get<string>('mail.from', 'Bogados <no-reply@bogados.local>');
    this.production = config.get<string>('nodeEnv') === 'production';
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
    this.transporter = smtpUrl ? createTransport(smtpUrl) : null;
    if (!this.transporter && this.production) {
      this.logger.warn('SMTP_URL no configurado: no se enviarán invitaciones ni recuperaciones de contraseña');
    }
  }

  async send(message: MailMessage): Promise<void> {
    const { tenantId, ...base } = message;
    const firm = tenantId ? await this.branding(tenantId) : null;
    const body = firm ? brandEmail(base, firm, this.appUrl) : base;
    // El remitente sigue siendo el de la plataforma (SPF/DKIM); el nombre y las respuestas, de la firma
    const from = firm ? { name: `${firm.name} vía Bogados`, address: addressOf(this.from) } : this.from;
    const replyTo = firm?.contactEmail ?? undefined;

    if (this.transporter) {
      await this.transporter.sendMail({ from, replyTo, to: base.to, subject: base.subject, text: body.text, html: body.html });
      return;
    }
    if (this.production) {
      throw new ServiceUnavailableException('El envío de correo no está configurado');
    }
    this.logger.log(`[sin SMTP_URL, no enviado] Para: ${base.to} · Asunto: ${base.subject}\n${body.text}`);
  }

  /** Si no se puede leer la firma, el email sale igual, sin su identidad. */
  private async branding(tenantId: string): Promise<FirmBranding | null> {
    try {
      const t = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          slug: true,
          brandColor: true,
          contactEmail: true,
          contactPhone: true,
          address: true,
          website: true,
          logoPath: true,
          logoUpdatedAt: true,
        },
      });
      if (!t) return null;
      const { logoPath, logoUpdatedAt, ...rest } = t;
      return { ...rest, logoVersion: logoPath && logoUpdatedAt ? logoUpdatedAt.getTime() : null };
    } catch (err) {
      this.logger.warn(`Sin identidad de la firma ${tenantId} en el email: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}
