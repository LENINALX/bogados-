import { Module, forwardRef } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { CaseRequestsService } from './case-requests.service';
import { CaseRequestsController } from './case-requests.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => ActivityModule), NotificationsModule],
  controllers: [CasesController, CaseRequestsController],
  providers: [CasesService, CaseRequestsService],
  exports: [CasesService],
})
export class CasesModule {}
