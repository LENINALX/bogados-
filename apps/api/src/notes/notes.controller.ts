import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cases/:caseId/notes', version: '1' })
export class NotesController {
  constructor(private notes: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notas (clientes: solo no internas)' })
  list(@Param('caseId') caseId: string, @CurrentUser() user: JwtPayloadUser) {
    return this.notes.list(caseId, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Crear nota (staff)' })
  create(
    @Param('caseId') caseId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.notes.create(caseId, dto, user);
  }
}
