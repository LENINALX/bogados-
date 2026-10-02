import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaseRequestState, CaseStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { CreateCaseRequestDto, DecideCaseRequestDto } from './dto/case-request.dto';
import { buildCaseRequestEmail, CaseRequestEmailKind } from './case-request-emails';

/** Solicitudes que aún esperan decisión */
export const OPEN_REQUEST_STATES: CaseRequestState[] = [
  CaseRequestState.pendiente,
  CaseRequestState.aplazada,
];

/** Solicitudes abiertas que puede tener a la vez un cliente */
export const MAX_OPEN_REQUESTS = 3;

const REJECT_REASON_MIN = 5;

const requestSelect = {
  id: true,
  title: true,
  status: true,
  requestState: true,
  decisionReason: true,
  decidedAt: true,
  createdAt: true,
  lawyer: { select: { id: true, name: true } },
} satisfies Prisma.CaseSelect;

type Person = { id: string; name: string; email: string };

@Injectable()
export class CaseRequestsService {
  private readonly logger = new Logger('CaseRequests');
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private notifications: NotificationsService,
    private mail: MailService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
  }

  /** El cliente pide un caso desde el portal: queda en `intake` sin abogado. */
  async create(dto: CreateCaseRequestDto, actor: JwtPayloadUser) {
    const open = await this.prisma.case.count({
      where: { tenantId: actor.tenantId, clientId: actor.id, requestState: { in: OPEN_REQUEST_STATES } },
    });
    if (open >= MAX_OPEN_REQUESTS) {
      throw new BadRequestException(
        `Ya tienes ${MAX_OPEN_REQUESTS} solicitudes en revisión. Espera a que el despacho las responda.`,
      );
    }

    const { created, admins } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          tenantId: actor.tenantId,
          clientId: actor.id,
          title: dto.title.trim(),
          matterType: dto.matterType?.trim() || null,
          description: dto.description.trim(),
          status: CaseStatus.intake,
          requestState: CaseRequestState.pendiente,
        },
        select: requestSelect,
      });
      await this.activity.log(
        {
          tenantId: actor.tenantId,
          caseId: created.id,
          actorId: actor.id,
          type: 'CASE_REQUESTED',
          summary: 'Solicitud enviada desde el portal',
        },
        tx,
      );
      // Las solicitudes no tienen abogado: las deciden los administradores
      const admins = await tx.user.findMany({
        where: { tenantId: actor.tenantId, role: Role.ADMIN, active: true },
        select: { id: true, name: true, email: true },
      });
      await this.notifications.notifyMany(
        admins.map((a) => a.id),
        {
          title: 'Nueva solicitud de caso',
          body: `${actor.name}: ${created.title}`,
          meta: { type: 'CASE_REQUESTED', caseId: created.id },
        },
        tx,
      );
      return { created, admins };
    });

    const tenantName = await this.tenantName(actor.tenantId);
    await this.sendEmail('received', { id: actor.id, name: actor.name, email: actor.email }, tenantName, {
      caseTitle: created.title,
      link: `${this.appUrl}/portal/casos/${created.id}`,
    });
    for (const admin of admins) {
      await this.sendEmail('new_request', admin, tenantName, {
        caseTitle: created.title,
        clientName: actor.name,
        link: `${this.appUrl}/casos/${created.id}`,
      });
    }
    return created;
  }

  /** El admin acepta, aplaza o rechaza una solicitud abierta. */
  async decide(caseId: string, dto: DecideCaseRequestDto, actor: JwtPayloadUser) {
    const current = await this.prisma.case.findFirst({
      where: { id: caseId, tenantId: actor.tenantId },
      include: { client: { select: { id: true, name: true, email: true } } },
    });
    if (!current?.requestState) throw new NotFoundException('Solicitud no encontrada');
    if (!OPEN_REQUEST_STATES.includes(current.requestState)) {
      throw new BadRequestException('Esta solicitud ya fue decidida');
    }

    const reason = dto.reason?.trim() || null;
    if (dto.decision === 'rechazar' && (!reason || reason.length < REJECT_REASON_MIN)) {
      throw new BadRequestException('Explica al cliente el motivo del rechazo');
    }
    const lawyer = dto.decision === 'aceptar' ? await this.findLawyer(dto.lawyerId ?? actor.id, actor.tenantId) : null;

    const now = new Date();
    const decided = { decisionReason: reason, decidedAt: now, decidedById: actor.id };
    const data: Prisma.CaseUncheckedUpdateManyInput =
      dto.decision === 'aceptar'
        ? { ...decided, requestState: CaseRequestState.aceptada, status: CaseStatus.abierto, lawyerId: lawyer!.id }
        : dto.decision === 'aplazar'
          ? { ...decided, requestState: CaseRequestState.aplazada }
          : { ...decided, requestState: CaseRequestState.rechazada, status: CaseStatus.cerrado, closedAt: now };

    const summary =
      dto.decision === 'aceptar'
        ? `Solicitud aceptada · Abogado responsable: ${lawyer!.name}`
        : dto.decision === 'aplazar'
          ? `Solicitud aplazada${reason ? `: ${reason}` : ''}`
          : `Solicitud no aceptada: ${reason}`;
    const type = { aceptar: 'CASE_ACCEPTED', aplazar: 'CASE_POSTPONED', rechazar: 'CASE_REJECTED' }[dto.decision];

    const updated = await this.prisma.$transaction(async (tx) => {
      // Condicional sobre el estado leído: dos admins no pueden decidir a la vez
      const { count } = await tx.case.updateMany({
        where: { id: caseId, requestState: current.requestState },
        data,
      });
      if (count === 0) {
        throw new ConflictException('Otro administrador acaba de decidir esta solicitud. Recarga la página.');
      }
      await this.activity.log(
        { tenantId: actor.tenantId, caseId, actorId: actor.id, type, summary, meta: { decision: dto.decision } },
        tx,
      );
      if (current.client && current.client.id !== actor.id) {
        await this.notifications.create(
          {
            userId: current.client.id,
            title: { aceptar: 'Caso aceptado', aplazar: 'Solicitud en espera', rechazar: 'Solicitud no aceptada' }[
              dto.decision
            ],
            body: `"${current.title}"${reason ? `: ${reason}` : ''}`,
            meta: { type, caseId },
          },
          tx,
        );
      }
      if (lawyer && lawyer.id !== actor.id) {
        await this.notifications.create(
          {
            userId: lawyer.id,
            title: 'Caso asignado',
            body: `Se te asignó el caso "${current.title}"`,
            meta: { type: 'CASE_ASSIGNED', caseId },
          },
          tx,
        );
      }
      return tx.case.findUniqueOrThrow({ where: { id: caseId }, select: requestSelect });
    });

    if (current.client) {
      const kind: CaseRequestEmailKind = { aceptar: 'accepted', aplazar: 'postponed', rechazar: 'rejected' }[
        dto.decision
      ] as CaseRequestEmailKind;
      await this.sendEmail(kind, current.client, await this.tenantName(actor.tenantId), {
        caseTitle: current.title,
        lawyerName: lawyer?.name,
        reason,
        link: `${this.appUrl}/portal/casos/${caseId}`,
      });
    }
    return updated;
  }

  private async findLawyer(lawyerId: string, tenantId: string): Promise<Person> {
    const lawyer = await this.prisma.user.findFirst({
      where: { id: lawyerId, tenantId, active: true, role: { in: [Role.ADMIN, Role.ABOGADO] } },
      select: { id: true, name: true, email: true },
    });
    if (!lawyer) throw new BadRequestException('Abogado no válido');
    return lawyer;
  }

  private async tenantName(tenantId: string) {
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } });
    return t.name;
  }

  /** Nunca lanza: un fallo de correo se registra y la operación sigue. */
  private async sendEmail(
    kind: CaseRequestEmailKind,
    recipient: Person,
    tenantName: string,
    d: { caseTitle: string; clientName?: string; lawyerName?: string; reason?: string | null; link: string },
  ) {
    try {
      const email = buildCaseRequestEmail({ kind, recipientName: recipient.name, tenantName, ...d });
      await this.mail.send({ to: recipient.email, ...email });
    } catch (err) {
      this.logger.error(
        `No se pudo enviar el email "${kind}" a ${recipient.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
