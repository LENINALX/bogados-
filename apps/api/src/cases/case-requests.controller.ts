import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CaseRequestsService } from './case-requests.service';
import { CreateCaseRequestDto, DecideCaseRequestDto } from './dto/case-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('case-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class CaseRequestsController {
  constructor(private requests: CaseRequestsService) {}

  @Post('portal/case-requests')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'El cliente pide un caso (queda pendiente de decisión del despacho)' })
  create(@Body() dto: CreateCaseRequestDto, @CurrentUser() user: JwtPayloadUser) {
    return this.requests.create(dto, user);
  }

  @Post('cases/:id/decision')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aceptar (asigna abogado), aplazar o rechazar (motivo obligatorio) una solicitud' })
  decide(
    @Param('id') id: string,
    @Body() dto: DecideCaseRequestDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.requests.decide(id, dto, user);
  }
}
