import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

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

  constructor(config: ConfigService) {
    const smtpUrl = config.get<string>('mail.smtpUrl', '');
    this.from = config.get<string>('mail.from', 'Bogados <no-reply@bogados.local>');
    this.production = config.get<string>('nodeEnv') === 'production';
    this.transporter = smtpUrl ? createTransport(smtpUrl) : null;
    if (!this.transporter && this.production) {
      this.logger.warn('SMTP_URL no configurado: no se enviarán invitaciones ni recuperaciones de contraseña');
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({ from: this.from, ...message });
      return;
    }
    if (this.production) {
      throw new ServiceUnavailableException('El envío de correo no está configurado');
    }
    this.logger.log(
      `[sin SMTP_URL, no enviado] Para: ${message.to} · Asunto: ${message.subject}\n${message.text}`,
    );
  }
}
