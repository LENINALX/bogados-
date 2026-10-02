import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  SetAvailabilityDto,
  SlotsQueryDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Get('lawyers/:id/availability')
  @ApiOperation({ summary: 'Disponibilidad semanal de un abogado (hora local de la firma)' })
  getAvailability(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.appointments.getAvailability(id, user);
  }

  @Put('lawyers/:id/availability')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Reemplazar la disponibilidad (abogado: solo la suya)' })
  setAvailability(
    @Param('id') id: string,
    @Body() dto: SetAvailabilityDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.appointments.setAvailability(id, dto, user);
  }

  @Get('appointments/lawyers')
  @ApiOperation({ summary: 'Abogados con disponibilidad (a quién se puede pedir cita)' })
  lawyers(@CurrentUser() user: JwtPayloadUser) {
    return this.appointments.bookableLawyers(user);
  }

  @Get('appointments/slots')
  @ApiOperation({ summary: 'Huecos libres de un abogado' })
  slots(@Query() query: SlotsQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.appointments.slots(query, user);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Citas (cliente: las suyas · abogado: su agenda · admin: la firma)' })
  list(@Query() query: ListAppointmentsQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.appointments.list(query, user);
  }

  @Post('appointments')
  @ApiOperation({
    summary: 'Crear cita (cliente: queda pendiente y solo en huecos libres · despacho: confirmada)',
  })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtPayloadUser) {
    return this.appointments.create(dto, user);
  }

  @Patch('appointments/:id/status')
  @ApiOperation({ summary: 'Confirmar, cancelar o completar (cliente: solo cancelar las suyas)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.appointments.updateStatus(id, dto, user);
  }
}
