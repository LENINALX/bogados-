import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del tenant (scoped por rol)' })
  stats(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboard.stats(user);
  }
}
