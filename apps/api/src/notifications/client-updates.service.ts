import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildClientUpdateEmail, ClientUpdate } from './client-update-emails';

/**
 * Aviso por email al cliente cuando su caso avanza (cambio de estado o nota visible).
 * El despacho decide en cada caso si se envía: aquí solo se envía.
 */
@Injectable()
export class ClientUpdatesService {
  private readonly logger = new Logger('ClientUpdates');
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
  }

  /**
   * Llamar después de confirmar la transacción. Nunca lanza: un fallo de correo
   * se registra y la operación sigue. Devuelve si el correo salió.
   */
  async email(caseId: string, update: ClientUpdate): Promise<boolean> {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        title: true,
        tenant: { select: { name: true } },
        lawyer: { select: { name: true } },
        client: { select: { name: true, email: true, active: true } },
      },
    });
    if (!c?.client?.active) return false;

    try {
      const email = buildClientUpdateEmail({
        update,
        recipientName: c.client.name,
        tenantName: c.tenant.name,
        caseTitle: c.title,
        lawyerName: c.lawyer?.name,
        link: `${this.appUrl}/portal/casos/${caseId}`,
      });
      await this.mail.send({ to: c.client.email, ...email });
      return true;
    } catch (err) {
      this.logger.error(
        `No se pudo avisar por email al cliente del caso ${caseId}`,
        err instanceof Error ? err.stack : String(err),
      );
      return false;
    }
  }
}
