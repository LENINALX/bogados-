import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ActivityService } from './activity.service';
import { ListFirmActivityQueryDto } from './dto/firm-activity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'activity', version: '1' })
export class FirmActivityController {
  constructor(private activity: ActivityService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actividad de toda la firma: quién hizo qué y cuándo (solo admin)' })
  list(@Query() query: ListFirmActivityQueryDto, @CurrentUser() user: JwtPayloadUser) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('La fecha «desde» no puede ser posterior a «hasta»');
    }
    return this.activity.listForTenant(user.tenantId, query);
  }
}
