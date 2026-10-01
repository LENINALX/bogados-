import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import {
  paginateParams,
  toPaginated,
} from '../common/dto/pagination.dto';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './dto/task.dto';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  case: { select: { id: true, title: true, status: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async list(user: JwtPayloadUser, query: ListTasksQueryDto) {
    const { page, pageSize, skip, take } = paginateParams(query);
    const where: Prisma.CaseTaskWhereInput = { tenantId: user.tenantId };

    if (query.caseId) {
      await getAccessibleCase(this.prisma, query.caseId, user);
      where.caseId = query.caseId;
    } else if (user.role === Role.ABOGADO) {
      where.OR = [
        { assigneeId: user.id },
        { case: { lawyerId: user.id } },
      ];
    } else if (user.role === Role.CLIENTE) {
      where.case = { clientId: user.id };
    }

    if (query.done !== undefined) where.done = query.done;
    if (query.overdue) {
      where.done = false;
      where.dueAt = { lt: new Date() };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.caseTask.count({ where }),
      this.prisma.caseTask.findMany({
        where,
        include: taskInclude,
        orderBy: [{ done: 'asc' }, { dueAt: 'asc' }],
        skip,
        take,
      }),
    ]);

    return toPaginated(items, total, page, pageSize);
  }

  async listByCase(caseId: string, user: JwtPayloadUser, query: ListTasksQueryDto) {
    return this.list(user, { ...query, caseId });
  }

  async listOverdue(user: JwtPayloadUser, query: ListTasksQueryDto) {
    return this.list(user, { ...query, overdue: true });
  }

  async create(dto: CreateTaskDto, user: JwtPayloadUser, caseIdParam?: string) {
    const caseId = caseIdParam || dto.caseId;
    if (!caseId) throw new BadRequestException('caseId es requerido');

    const c = await getAccessibleCase(this.prisma, caseId, user);

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: {
          id: dto.assigneeId,
          tenantId: user.tenantId,
          active: true,
          role: { in: [Role.ADMIN, Role.ABOGADO] },
        },
      });
      if (!assignee) throw new BadRequestException('Asignatario no válido');
    }

    return this.prisma.caseTask.create({
      data: {
        tenantId: user.tenantId,
        caseId: c.id,
        title: dto.title,
        dueAt: new Date(dto.dueAt),
        assigneeId: dto.assigneeId ?? user.id,
      },
      include: taskInclude,
    });
  }

  async update(id: string, dto: UpdateTaskDto, user: JwtPayloadUser) {
    const task = await this.findAccessibleTask(id, user);
    const data: Prisma.CaseTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.dueAt !== undefined) data.dueAt = new Date(dto.dueAt);
    if (dto.done !== undefined) data.done = dto.done;
    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId) {
        const assignee = await this.prisma.user.findFirst({
          where: {
            id: dto.assigneeId,
            tenantId: user.tenantId,
            active: true,
            role: { in: [Role.ADMIN, Role.ABOGADO] },
          },
        });
        if (!assignee) throw new BadRequestException('Asignatario no válido');
        data.assignee = { connect: { id: dto.assigneeId } };
      } else {
        data.assignee = { disconnect: true };
      }
    }

    return this.prisma.caseTask.update({
      where: { id: task.id },
      data,
      include: taskInclude,
    });
  }

  async remove(id: string, user: JwtPayloadUser) {
    const task = await this.findAccessibleTask(id, user);
    await this.prisma.caseTask.delete({ where: { id: task.id } });
    return { ok: true };
  }

  private async findAccessibleTask(id: string, user: JwtPayloadUser) {
    const task = await this.prisma.caseTask.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    await getAccessibleCase(this.prisma, task.caseId, user);
    return task;
  }
}
