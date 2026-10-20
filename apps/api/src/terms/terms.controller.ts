import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { TermsService } from './terms.service';
import { CreateHolidayDto, HolidaysQueryDto, TermDeadlineQueryDto } from './dto/terms.dto';

@ApiTags('terms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class TermsController {
  constructor(private terms: TermsService) {}

  @Get('terms/deadline')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Vencimiento de un término en días hábiles, con el desglose del cálculo' })
  deadline(@CurrentUser() user: JwtPayloadUser, @Query() q: TermDeadlineQueryDto) {
    return this.terms.deadline(user.tenantId, q.notifiedOn, q.days);
  }

  @Get('holidays')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Feriados del bufete en un año' })
  list(@CurrentUser() user: JwtPayloadUser, @Query() q: HolidaysQueryDto) {
    return this.terms.listHolidays(user.tenantId, q.year);
  }

  @Post('holidays')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Añadir un feriado (local, traslado, etc.)' })
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateHolidayDto) {
    return this.terms.createHoliday(user.tenantId, dto.date, dto.name);
  }

  @Post('holidays/national')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cargar los feriados nacionales de Ecuador del año (fecha original, sin traslados)' })
  loadNational(@CurrentUser() user: JwtPayloadUser, @Query() q: HolidaysQueryDto) {
    return this.terms.loadNationalHolidays(user.tenantId, q.year);
  }

  @Delete('holidays/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar un feriado' })
  remove(@CurrentUser() user: JwtPayloadUser, @Param('id', ParseIdPipe) id: string) {
    return this.terms.removeHoliday(user.tenantId, id);
  }
}
