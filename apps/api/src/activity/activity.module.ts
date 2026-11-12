import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { FirmActivityController } from './firm-activity.controller';

@Module({
  controllers: [ActivityController, FirmActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
