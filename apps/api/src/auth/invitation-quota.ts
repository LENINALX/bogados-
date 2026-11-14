import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Altas e invitaciones por firma y día: de sobra para un despacho, poco para usarla de envío masivo. */
export const INVITATIONS_PER_DAY = 50;

/**
 * Cada alta de usuario o reenvío de invitación manda un email desde la plataforma. Sin tope, una
 * firma recién creada podría usarla para enviar correo a direcciones ajenas.
 */
export async function assertInvitationQuota(prisma: PrismaService, tenantId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [created, resent] = await Promise.all([
    prisma.user.count({ where: { tenantId, createdAt: { gt: since } } }),
    prisma.activityEvent.count({ where: { tenantId, type: 'USER_INVITED', createdAt: { gt: since } } }),
  ]);
  if (created + resent >= INVITATIONS_PER_DAY) {
    throw new HttpException(
      `Tu firma ha llegado al máximo de ${INVITATIONS_PER_DAY} altas e invitaciones en 24 horas. Inténtalo mañana.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
