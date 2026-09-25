import { Module, forwardRef } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [forwardRef(() => ActivityModule)],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
