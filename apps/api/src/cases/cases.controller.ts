import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CasesService } from './cases.service';
import {
  AssignLawyerDto,
  CreateCaseDto,
  ListCasesQueryDto,
  PatchStatusDto,
  UpdateCaseDto,
} from './dto/case.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cases', version: '1' })
export class CasesController {
  constructor(private cases: CasesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar casos (paginado + filtros por rol)' })
  findAll(@CurrentUser() user: JwtPayloadUser, @Query() query: ListCasesQueryDto) {
    return this.cases.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de caso (+ notas filtradas)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.cases.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ABOGADO)
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: JwtPayloadUser) {
    return this.cases.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ABOGADO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.cases.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Transición de estado' })
  patchStatus(
    @Param('id') id: string,
    @Body() dto: PatchStatusDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.cases.patchStatus(id, dto, user);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Asignar abogado' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignLawyerDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.cases.assignLawyer(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.cases.remove(id, user);
  }
}
