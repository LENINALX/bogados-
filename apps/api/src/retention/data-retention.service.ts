import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60_000;

/**
 * Cuánto se guarda cada dato personal que no forma parte de un expediente (LOPDP: minimización
 * y conservación limitada). Los casos, documentos y su actividad son el expediente del despacho y
 * no se borran aquí.
 */
export const RETENTION = {
  /** Registro de accesos (IP, navegador): lo justo para investigar un acceso sospechoso */
  loginEventsDays: 180,
  /** Intentos con emails que no son de ninguna cuenta: solo sirven para el bloqueo por fallos */
  unknownLoginEventsDays: 30,
  /** Códigos de acceso (caducan a los 10 minutos) */
  loginChallengesDays: 1,
  /** Enlaces de invitación, recuperación o confirmación ya usados o caducados */
  userTokensDays: 30,
} as const;

/** Borra cada noche los datos personales que ya no hace falta conservar. RETENTION_ENABLED=false lo apaga. */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger('DataRetention');
  private readonly enabled: boolean;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('nodeEnv') !== 'test' && process.env.RETENTION_ENABLED !== 'false';
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async nightly() {
    if (!this.enabled) return;
    try {
      const removed = await this.purge();
      const total = Object.values(removed).reduce((a, b) => a + b, 0);
      if (total > 0) this.logger.log(`Datos caducados borrados: ${JSON.stringify(removed)}`);
    } catch (err) {
      this.logger.error('Fallo al borrar datos caducados', err instanceof Error ? err.stack : String(err));
    }
  }

  async purge(now = new Date()) {
    const before = (days: number) => new Date(now.getTime() - days * DAY);
    const [loginEvents, unknownLoginEvents, challenges, tokens, revoked] = await this.prisma.$transaction([
      this.prisma.loginEvent.deleteMany({ where: { createdAt: { lt: before(RETENTION.loginEventsDays) } } }),
      this.prisma.loginEvent.deleteMany({
        where: { userId: null, createdAt: { lt: before(RETENTION.unknownLoginEventsDays) } },
      }),
      this.prisma.loginChallenge.deleteMany({ where: { createdAt: { lt: before(RETENTION.loginChallengesDays) } } }),
      this.prisma.userToken.deleteMany({
        where: {
          OR: [{ usedAt: { lt: before(RETENTION.userTokensDays) } }, { expiresAt: { lt: before(RETENTION.userTokensDays) } }],
        },
      }),
      // Un token revocado que ya habría caducado no necesita seguir en la lista
      this.prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);
    return {
      loginEvents: loginEvents.count,
      unknownLoginEvents: unknownLoginEvents.count,
      loginChallenges: challenges.count,
      userTokens: tokens.count,
      revokedTokens: revoked.count,
    };
  }
}
