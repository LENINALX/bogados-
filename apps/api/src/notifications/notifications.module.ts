import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ClientUpdatesService } from './client-updates.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, ClientUpdatesService],
  exports: [NotificationsService, ClientUpdatesService],
})
export class NotificationsModule {}
