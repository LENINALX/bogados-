import { BadRequestException, Injectable } from '@nestjs/common';
import { CaseStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';
import { ActivityService } from '../activity/activity.service';
import {
  AssignLawyerDto,
  CreateCaseDto,
  PatchStatusDto,
  UpdateCaseDto,
} from './dto/case.dto';

const caseInclude = {
  lawyer: { select: { id: true, name: true, email: true } },
  client: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async findAll(
    user: JwtPayloadUser,
    filters: { status?: CaseStatus; q?: string },
  ) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (filters.status) where.status = filters.status;
    if (user.role === Role.CLIENTE) where.clientId = user.id;
    else if (user.role === Role.ABOGADO) where.lawyerId = user.id;
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.case.findMany({
      where,
      include: caseInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayloadUser) {
    const base = await getAccessibleCase(this.prisma, id, user);
    const c = await this.prisma.case.findFirst({
      where: { id: base.id },
      include: {
        ...caseInclude,
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!c) return null;
    if (!isStaff(user.role)) {
      c.notes = c.notes.filter((n) => !n.isInternal);
    }
    return c;
  }

  async create(dto: CreateCaseDto, user: JwtPayloadUser) {
    const lawyerId =
      user.role === Role.ABOGADO ? user.id : dto.lawyerId ?? user.id;

    const created = await this.prisma.case.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        description: dto.description,
        matterType: dto.matterType,
        status: dto.status ?? CaseStatus.intake,
        lawyerId,
        clientId: dto.clientId ?? null,
      },
      include: caseInclude,
    });

    await this.activity.log({
      tenantId: user.tenantId,
      caseId: created.id,
      actorId: user.id,
      type: 'CASE_CREATED',
      summary: `Caso creado: ${created.title}`,
      meta: { status: created.status },
    });

    return created;
  }

  async update(id: string, dto: UpdateCaseDto, user: JwtPayloadUser) {
    const existing = await getAccessibleCase(this.prisma, id, user);
    const data: UpdateCaseDto = { ...dto };

    if (user.role !== Role.ADMIN) {
      delete data.lawyerId;
      delete data.clientId;
    }

    const prevStatus = existing.status;
    const updated = await this.prisma.case.update({
      where: { id: existing.id },
      data: {
        ...data,
        closedAt:
          data.status === CaseStatus.cerrado
            ? new Date()
            : data.status
              ? null
              : undefined,
      },
      include: caseInclude,
    });

    if (data.status && data.status !== prevStatus) {
      await this.activity.log({
        tenantId: user.tenantId,
        caseId: updated.id,
        actorId: user.id,
        type: 'STATUS_CHANGED',
        summary: `Estado: ${prevStatus} → ${data.status}`,
        meta: { from: prevStatus, to: data.status },
      });
    }

    return updated;
  }

  async patchStatus(id: string, dto: PatchStatusDto, user: JwtPayloadUser) {
    return this.update(id, { status: dto.status }, user);
  }

  async assignLawyer(id: string, dto: AssignLawyerDto, user: JwtPayloadUser) {
    const existing = await getAccessibleCase(this.prisma, id, user);
    const lawyer = await this.prisma.user.findFirst({
      where: {
        id: dto.lawyerId,
        tenantId: user.tenantId,
        role: { in: [Role.ABOGADO, Role.ADMIN] },
        active: true,
      },
    });
    if (!lawyer) {
      throw new BadRequestException('Abogado no válido');
    }

    const updated = await this.prisma.case.update({
      where: { id: existing.id },
      data: { lawyerId: dto.lawyerId },
      include: caseInclude,
    });

    await this.activity.log({
      tenantId: user.tenantId,
      caseId: updated.id,
      actorId: user.id,
      type: 'ASSIGNED',
      summary: `Abogado asignado: ${updated.lawyer?.name ?? dto.lawyerId}`,
      meta: { lawyerId: dto.lawyerId },
    });

    return updated;
  }

  async remove(id: string, user: JwtPayloadUser) {
    const existing = await getAccessibleCase(this.prisma, id, user);
    await this.prisma.case.delete({ where: { id: existing.id } });
    return { ok: true };
  }
}
