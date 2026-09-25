import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENTE)
@Controller({ path: 'portal', version: '1' })
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @Get('cases')
  @ApiOperation({ summary: 'Casos del cliente autenticado' })
  myCases(@CurrentUser() user: JwtPayloadUser) {
    return this.clients.myCases(user);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Detalle portal (docs compartidos + notas públicas)' })
  myCase(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.clients.myCase(id, user);
  }
}
