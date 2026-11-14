import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CaseStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';
import { ActivityService, recordActivity } from '../activity/activity.service';
import { StorageService } from '../storage/storage.service';
import { OPEN_REQUEST_STATES } from './case-requests.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ClientUpdatesService } from '../notifications/client-updates.service';
import { clientStatusLabel } from '../notifications/client-update-emails';
import {
  paginateParams,
  toPaginated,
} from '../common/dto/pagination.dto';
import {
  AssignLawyerDto,
  CreateCaseDto,
  ListCasesQueryDto,
  PatchStatusDto,
  UpdateCaseDto,
} from './dto/case.dto';

/** Lo que el despacho decide contar al cliente al cambiar el estado. */
export type StatusNotice = { notifyClient?: boolean; clientMessage?: string };

const caseInclude = {
  lawyer: { select: { id: true, name: true, email: true } },
  client: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private notifications: NotificationsService,
    private clientUpdates: ClientUpdatesService,
    private storage: StorageService,
  ) {}

  private readonly logger = new Logger('Cases');

  async findAll(user: JwtPayloadUser, filters: ListCasesQueryDto) {
    const { page, pageSize, skip, take } = paginateParams(filters);
    const where: Prisma.CaseWhereInput = { tenantId: user.tenantId };
    if (filters.status) where.status = filters.status;
    if (user.role === Role.CLIENTE) where.clientId = user.id;
    else if (user.role === Role.ABOGADO) where.lawyerId = user.id;
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        include: caseInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return toPaginated(items, total, page, pageSize);
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

    if (lawyerId !== user.id) await this.assertValidLawyer(lawyerId, user.tenantId);
    if (dto.clientId) await this.assertValidClient(dto.clientId, user.tenantId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          tenantId: user.tenantId,
          title: dto.title,
          description: dto.description,
          matterType: dto.matterType,
          processNumber: dto.processNumber ?? null,
          status: dto.status ?? CaseStatus.intake,
          lawyerId,
          clientId: dto.clientId ?? null,
        },
        include: caseInclude,
      });

      await this.activity.log(
        {
          tenantId: user.tenantId,
          caseId: created.id,
          actorId: user.id,
          type: 'CASE_CREATED',
          summary: `Caso creado: ${created.title}`,
          meta: { status: created.status },
        },
        tx,
      );

      return created;
    });
  }

  /** `notice` solo llega desde el cambio de estado: sin él no se avisa al cliente por email. */
  async update(id: string, dto: UpdateCaseDto, user: JwtPayloadUser, notice?: StatusNotice) {
    const existing = await getAccessibleCase(this.prisma, id, user);
    const data: UpdateCaseDto = { ...dto };

    if (user.role !== Role.ADMIN) {
      delete data.lawyerId;
      delete data.clientId;
    }
    // Una solicitud del portal cambia de estado al decidirla (aceptar/aplazar/rechazar),
    // no a mano: si no, el caso quedaría "abierto" con la solicitud aún "pendiente"
    if (
      data.status &&
      data.status !== existing.status &&
      existing.requestState &&
      OPEN_REQUEST_STATES.includes(existing.requestState)
    ) {
      throw new BadRequestException('Primero acepta, aplaza o rechaza la solicitud del cliente');
    }
    // Una solicitud rechazada no se reabre cambiando el estado: quedaría «abierta» pero el portal
    // seguiría diciendo «No aceptada» y sin abogado. Que el cliente envíe una solicitud nueva.
    if (data.status && data.status !== existing.status && existing.requestState === 'rechazada') {
      throw new BadRequestException('Esta solicitud fue rechazada: no se puede cambiar su estado');
    }
    // null desasigna; un id debe ser un usuario activo del tenant con el rol adecuado
    if (data.lawyerId) await this.assertValidLawyer(data.lawyerId, user.tenantId);
    if (data.clientId) await this.assertValidClient(data.clientId, user.tenantId);

    const prevStatus = existing.status;
    const statusChanged = Boolean(data.status && data.status !== prevStatus);
    const clientMessage = notice?.clientMessage?.trim() || undefined;
    const emailClient = Boolean(notice) && notice?.notifyClient !== false;

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id: existing.id },
        data: {
          ...data,
          // Solo si el estado cambia de verdad: volver a guardar «cerrado» no mueve la fecha de cierre
          closedAt: !statusChanged ? undefined : data.status === CaseStatus.cerrado ? new Date() : null,
        },
        include: caseInclude,
      });

      if (data.processNumber !== undefined && data.processNumber !== existing.processNumber) {
        await this.activity.log(
          {
            tenantId: user.tenantId,
            caseId: existing.id,
            actorId: user.id,
            type: 'PROCESS_LINKED',
            summary: data.processNumber
              ? `Proceso judicial vinculado: ${data.processNumber}`
              : 'Proceso judicial desvinculado',
            meta: { processNumber: data.processNumber },
          },
          tx,
        );
      }

      if (data.status && data.status !== prevStatus) {
        await this.activity.log(
          {
            tenantId: user.tenantId,
            caseId: updated.id,
            actorId: user.id,
            type: 'STATUS_CHANGED',
            summary: `Estado: ${prevStatus} → ${data.status}`,
            meta: {
              from: prevStatus,
              to: data.status,
              ...(clientMessage ? { message: clientMessage } : {}),
              ...(emailClient && updated.clientId ? { emailedClient: true } : {}),
            },
          },
          tx,
        );

        await this.notifications.notifyMany(
          [updated.lawyerId, updated.clientId].filter((id) => id && id !== user.id),
          {
            title: 'Cambio de estado del caso',
            body: `"${updated.title}": ${clientStatusLabel(prevStatus)} → ${clientStatusLabel(data.status)}`,
            meta: {
              type: 'CASE_STATUS',
              caseId: updated.id,
              from: prevStatus,
              to: data.status,
            },
          },
          tx,
        );
      }

      return updated;
    });

    // Fuera de la transacción: el correo no se puede deshacer si algo falla antes del commit
    if (statusChanged && emailClient && result.clientId && result.clientId !== user.id) {
      await this.clientUpdates.email(result.id, {
        kind: 'status',
        from: prevStatus,
        to: result.status,
        message: clientMessage,
      });
    }
    return result;
  }

  async patchStatus(id: string, dto: PatchStatusDto, user: JwtPayloadUser) {
    return this.update(id, { status: dto.status }, user, {
      notifyClient: dto.notifyClient,
      clientMessage: dto.clientMessage,
    });
  }

  async assignLawyer(id: string, dto: AssignLawyerDto, user: JwtPayloadUser) {
    const existing = await getAccessibleCase(this.prisma, id, user);
    await this.assertValidLawyer(dto.lawyerId, user.tenantId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id: existing.id },
        data: { lawyerId: dto.lawyerId },
        include: caseInclude,
      });

      await this.activity.log(
        {
          tenantId: user.tenantId,
          caseId: updated.id,
          actorId: user.id,
          type: 'ASSIGNED',
          summary: `Abogado asignado: ${updated.lawyer?.name ?? dto.lawyerId}`,
          meta: { lawyerId: dto.lawyerId },
        },
        tx,
      );

      if (dto.lawyerId !== user.id) {
        await this.notifications.create(
          {
            userId: dto.lawyerId,
            title: 'Caso asignado',
            body: `Se te asignó el caso "${updated.title}"`,
            meta: { type: 'CASE_ASSIGNED', caseId: updated.id },
          },
          tx,
        );
      }

      return updated;
    });
  }

  /**
   * Borra el caso y todo lo suyo (cascada). Los archivos de sus documentos se borran del disco
   * después de confirmar, y el borrado queda en la actividad de la firma (sin caso al que apuntar).
   */
  async remove(id: string, user: JwtPayloadUser) {
    const existing = await getAccessibleCase(this.prisma, id, user);
    const files = await this.prisma.document.findMany({
      where: { caseId: existing.id, tenantId: user.tenantId },
      select: { storagePath: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.case.delete({ where: { id: existing.id } });
      await recordActivity(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        type: 'CASE_DELETED',
        summary: `Caso eliminado: ${existing.title}${files.length ? ` (con ${files.length} ${files.length === 1 ? 'documento' : 'documentos'})` : ''}`,
        meta: { caseId: existing.id },
      });
    });
    for (const f of files) {
      await this.storage.remove(f.storagePath).catch((err) =>
        this.logger.warn(`No se pudo borrar ${f.storagePath}: ${err instanceof Error ? err.message : String(err)}`),
      );
    }
    return { ok: true };
  }

  private async assertValidLawyer(lawyerId: string, tenantId: string) {
    const lawyer = await this.prisma.user.findFirst({
      where: {
        id: lawyerId,
        tenantId,
        role: { in: [Role.ABOGADO, Role.ADMIN] },
        active: true,
      },
    });
    if (!lawyer) throw new BadRequestException('Abogado no válido');
  }

  private async assertValidClient(clientId: string, tenantId: string) {
    const client = await this.prisma.user.findFirst({
      where: {
        id: clientId,
        tenantId,
        role: Role.CLIENTE,
        active: true,
      },
    });
    if (!client) throw new BadRequestException('Cliente no válido');
  }
}
