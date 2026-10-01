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
import { TasksService } from './tasks.service';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get('tasks')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Listar tareas del tenant (paginado)' })
  list(@CurrentUser() user: JwtPayloadUser, @Query() query: ListTasksQueryDto) {
    return this.tasks.list(user, query);
  }

  @Get('tasks/overdue')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Listar tareas vencidas sin completar' })
  overdue(@CurrentUser() user: JwtPayloadUser, @Query() query: ListTasksQueryDto) {
    return this.tasks.listOverdue(user, query);
  }

  @Post('tasks')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Crear tarea (caseId en body)' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtPayloadUser) {
    return this.tasks.create(dto, user);
  }

  @Get('cases/:caseId/tasks')
  @ApiOperation({ summary: 'Listar tareas de un caso' })
  listByCase(
    @Param('caseId') caseId: string,
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasks.listByCase(caseId, user, query);
  }

  @Post('cases/:caseId/tasks')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Crear tarea en un caso' })
  createForCase(
    @Param('caseId') caseId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.tasks.create(dto, user, caseId);
  }

  @Patch('tasks/:id')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Actualizar tarea' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.tasks.update(id, dto, user);
  }

  @Delete('tasks/:id')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiOperation({ summary: 'Eliminar tarea' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.tasks.remove(id, user);
  }
}
