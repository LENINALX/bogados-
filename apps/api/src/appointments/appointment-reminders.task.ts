import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service';

/**
 * Recordatorios dentro de la propia API (no hay endpoint público que los
 * dispare). Desactivable con REMINDERS_ENABLED=false.
 */
@Injectable()
export class AppointmentRemindersTask {
  private readonly logger = new Logger('AppointmentReminders');
  private readonly enabled: boolean;

  constructor(
    private appointments: AppointmentsService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('reminders.enabled', true);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run() {
    if (!this.enabled) return;
    try {
      const sent = await this.appointments.sendReminders();
      if (sent > 0) this.logger.log(`${sent} recordatorio(s) de cita enviados`);
    } catch (err) {
      this.logger.error('Fallo al enviar recordatorios', err instanceof Error ? err.stack : String(err));
    }
  }
}
