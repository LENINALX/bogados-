import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cases/:caseId/activity', version: '1' })
export class ActivityController {
  constructor(private activity: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Timeline / auditoría del caso' })
  timeline(@Param('caseId') caseId: string, @CurrentUser() user: JwtPayloadUser) {
    return this.activity.timeline(caseId, user);
  }
}
