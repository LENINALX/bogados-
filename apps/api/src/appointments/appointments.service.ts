import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  SetAvailabilityDto,
  SlotsQueryDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';
import {
  addDaysYmd,
  computeSlots,
  formatHHMM,
  localYmd,
  parseHHMM,
  validateBlocks,
  zonedToUtc,
} from './time';
import { AppointmentEmailKind, buildAppointmentEmail } from './appointment-emails';

/** Estados que ocupan la agenda del abogado */
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.pendiente,
  AppointmentStatus.confirmada,
];

/** Citas futuras activas que puede tener a la vez un cliente (evita llenar la agenda) */
export const MAX_ACTIVE_PER_CLIENT = 3;

export const SLOT_TAKEN_MESSAGE = 'Ese horario acaba de ocuparse. Elige otro.';

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

const appointmentInclude = {
  lawyer: { select: { id: true, name: true, email: true } },
  client: { select: { id: true, name: true, email: true } },
  case: { select: { id: true, title: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithPeople = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;
type Person = { id: string; name: string; email: string };

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger('Appointments');
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
  }

  // ─── Disponibilidad ────────────────────────────────────────────────────────

  async getAvailability(lawyerId: string, actor: JwtPayloadUser) {
    await this.assertLawyer(lawyerId, actor.tenantId);
    const rows = await this.prisma.availability.findMany({
      where: { tenantId: actor.tenantId, lawyerId },
      orderBy: [{ weekday: 'asc' }, { startMin: 'asc' }],
    });
    return rows.map((r) => ({
      weekday: r.weekday,
      start: formatHHMM(r.startMin),
      end: formatHHMM(r.endMin),
    }));
  }

  /** Reemplaza la disponibilidad semanal completa del abogado. */
  async setAvailability(lawyerId: string, dto: SetAvailabilityDto, actor: JwtPayloadUser) {
    if (actor.role === Role.ABOGADO && lawyerId !== actor.id) {
      throw new ForbiddenException('Solo puedes editar tu propia disponibilidad');
    }
    await this.assertLawyer(lawyerId, actor.tenantId);
    const blocks = dto.blocks.map((b) => ({
      weekday: b.weekday,
      startMin: parseHHMM(b.start) ?? -1,
      endMin: parseHHMM(b.end) ?? -1,
    }));
    const error = validateBlocks(blocks);
    if (error) throw new BadRequestException(error);

    await this.prisma.$transaction([
      this.prisma.availability.deleteMany({ where: { tenantId: actor.tenantId, lawyerId } }),
      this.prisma.availability.createMany({
        data: blocks.map((b) => ({ ...b, tenantId: actor.tenantId, lawyerId })),
      }),
    ]);
    return this.getAvailability(lawyerId, actor);
  }

  /** Staff de la firma con disponibilidad configurada (a quién se puede pedir cita). */
  bookableLawyers(actor: JwtPayloadUser) {
    return this.prisma.user.findMany({
      where: {
        tenantId: actor.tenantId,
        active: true,
        role: { in: [Role.ADMIN, Role.ABOGADO] },
        availability: { some: {} },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Huecos libres ─────────────────────────────────────────────────────────

  async slots(query: SlotsQueryDto, actor: JwtPayloadUser, now = new Date()) {
    await this.assertLawyer(query.lawyerId, actor.tenantId);
    const tenant = await this.tenantSettings(actor.tenantId);
    const today = localYmd(now, tenant.timezone);
    // Nunca se ofrecen días pasados aunque se pidan
    const fromYmd = query.from && query.from > today ? query.from : today;
    const days = query.days ?? 14;

    const rangeStart = zonedToUtc(fromYmd, 0, tenant.timezone);
    const rangeEnd = zonedToUtc(addDaysYmd(fromYmd, days), 0, tenant.timezone);
    const [blocks, busy] = await Promise.all([
      this.prisma.availability.findMany({ where: { tenantId: actor.tenantId, lawyerId: query.lawyerId } }),
      this.busy(query.lawyerId, rangeStart, rangeEnd),
    ]);

    const slots = computeSlots({
      blocks,
      busy,
      fromYmd,
      days,
      timeZone: tenant.timezone,
      slotMinutes: tenant.appointmentMinutes,
      now,
    });
    return {
      timeZone: tenant.timezone,
      slotMinutes: tenant.appointmentMinutes,
      slots: slots.map((s) => ({ startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString() })),
    };
  }

  // ─── Crear ─────────────────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto, actor: JwtPayloadUser, now = new Date()) {
    const tenant = await this.tenantSettings(actor.tenantId);
    const byClient = actor.role === Role.CLIENTE;

    const lawyerId = byClient ? dto.lawyerId : (dto.lawyerId ?? actor.id);
    if (!lawyerId) throw new BadRequestException('Elige un abogado');
    if (actor.role === Role.ABOGADO && lawyerId !== actor.id) {
      throw new ForbiddenException('Solo puedes crear citas en tu propia agenda');
    }
    const lawyer = await this.assertLawyer(lawyerId, actor.tenantId);

    const client = byClient
      ? { id: actor.id, name: actor.name, email: actor.email }
      : await this.findClient(dto.clientId, actor.tenantId);

    if (dto.caseId) await this.assertCase(dto.caseId, client.id, actor);

    const startsAt = new Date(dto.startsAt);
    if (startsAt <= now) throw new BadRequestException('La cita debe ser en el futuro');
    const minutes = byClient ? tenant.appointmentMinutes : (dto.durationMinutes ?? tenant.appointmentMinutes);
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

    if (byClient) {
      await this.assertOfferedSlot(lawyerId, startsAt, tenant, actor.tenantId, now);
      const active = await this.prisma.appointment.count({
        where: { clientId: client.id, status: { in: ACTIVE_STATUSES }, startsAt: { gt: now } },
      });
      if (active >= MAX_ACTIVE_PER_CLIENT) {
        throw new BadRequestException(
          `Ya tienes ${MAX_ACTIVE_PER_CLIENT} citas pendientes o confirmadas. Cancela alguna para pedir otra.`,
        );
      }
    }

    // Comprobar y reservar en la misma transacción serializable: si dos personas
    // piden el mismo hueco a la vez, Postgres aborta una de las dos (P2034).
    const recipient = byClient ? lawyer : client;
    let appointment: AppointmentWithPeople;
    try {
      appointment = await this.prisma.$transaction(
        async (tx) => {
          const clash = await tx.appointment.count({
            where: {
              lawyerId,
              status: { in: ACTIVE_STATUSES },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          });
          if (clash > 0) throw new ConflictException(SLOT_TAKEN_MESSAGE);

          const created = await tx.appointment.create({
            data: {
              tenantId: actor.tenantId,
              lawyerId,
              clientId: client.id,
              caseId: dto.caseId ?? null,
              startsAt,
              endsAt,
              status: byClient ? AppointmentStatus.pendiente : AppointmentStatus.confirmada,
              reason: dto.reason?.trim() || null,
              createdById: actor.id,
            },
            include: appointmentInclude,
          });

          if (recipient.id !== actor.id) {
            await this.notifications.create(
              {
                userId: recipient.id,
                title: byClient ? 'Nueva solicitud de cita' : 'Cita programada',
                body: `${actor.name}: ${this.when(startsAt, tenant.timezone)}`,
                meta: { type: byClient ? 'APPOINTMENT_REQUESTED' : 'APPOINTMENT_SCHEDULED', appointmentId: created.id },
              },
              tx,
            );
          }
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        throw new ConflictException(SLOT_TAKEN_MESSAGE);
      }
      throw err;
    }

    // El email va fuera de la transacción: si falla, la cita sigue creada
    if (recipient.id !== actor.id) {
      await this.sendEmail(byClient ? 'requested' : 'confirmed', recipient, actor.name, appointment, tenant, byClient);
    }
    return appointment;
  }

  // ─── Listar ────────────────────────────────────────────────────────────────

  list(query: ListAppointmentsQueryDto, actor: JwtPayloadUser, now = new Date()) {
    const where: Prisma.AppointmentWhereInput = { tenantId: actor.tenantId };
    if (actor.role === Role.CLIENTE) where.clientId = actor.id;
    else if (actor.role === Role.ABOGADO) where.lawyerId = actor.id;
    else if (query.lawyerId) where.lawyerId = query.lawyerId;

    // Por defecto: las que aún no han terminado
    where.endsAt = { gt: query.from ? new Date(query.from) : now };
    if (query.to) where.startsAt = { lt: new Date(query.to) };
    if (query.status) where.status = query.status;

    return this.prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
  }

  // ─── Cambiar estado ────────────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto, actor: JwtPayloadUser, now = new Date()) {
    const where: Prisma.AppointmentWhereInput = { id, tenantId: actor.tenantId };
    if (actor.role === Role.CLIENTE) where.clientId = actor.id;
    if (actor.role === Role.ABOGADO) where.lawyerId = actor.id;
    const current = await this.prisma.appointment.findFirst({ where, include: appointmentInclude });
    if (!current) throw new NotFoundException('Cita no encontrada');

    this.assertTransition(current, dto.status, actor, now);

    const tenant = await this.tenantSettings(actor.tenantId);
    const byClient = actor.role === Role.CLIENTE;
    const recipient: Person | null =
      dto.status === AppointmentStatus.completada ? null : byClient ? current.lawyer : current.client;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Condicional sobre el estado leído: si otro usuario la cambió entre medias, no se pisa
      const { count } = await tx.appointment.updateMany({
        where: { id, status: current.status },
        data: { status: dto.status, note: dto.note?.trim() || current.note },
      });
      if (count === 0) throw new ConflictException('La cita cambió mientras tanto. Recarga la página.');

      if (recipient && recipient.id !== actor.id) {
        await this.notifications.create(
          {
            userId: recipient.id,
            title: dto.status === AppointmentStatus.confirmada ? 'Cita confirmada' : 'Cita cancelada',
            body: `${actor.name}: ${this.when(current.startsAt, tenant.timezone)}`,
            meta: { type: `APPOINTMENT_${dto.status.toUpperCase()}`, appointmentId: id },
          },
          tx,
        );
      }
      return tx.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
    });

    if (recipient && recipient.id !== actor.id) {
      const kind: AppointmentEmailKind = dto.status === AppointmentStatus.confirmada ? 'confirmed' : 'cancelled';
      await this.sendEmail(kind, recipient, actor.name, updated, tenant, byClient);
    }
    return updated;
  }

  /** Reglas de transición; lanza 400/403 si no se permite. */
  private assertTransition(
    current: { status: AppointmentStatus; startsAt: Date },
    next: AppointmentStatus,
    actor: JwtPayloadUser,
    now: Date,
  ) {
    const from = current.status;
    const active = ACTIVE_STATUSES.includes(from);

    if (actor.role === Role.CLIENTE) {
      if (next !== AppointmentStatus.cancelada) {
        throw new ForbiddenException('Solo puedes cancelar tus citas');
      }
      if (!active || current.startsAt <= now) {
        throw new BadRequestException('Esta cita ya no se puede cancelar');
      }
      return;
    }

    const allowed =
      (next === AppointmentStatus.confirmada && from === AppointmentStatus.pendiente) ||
      (next === AppointmentStatus.cancelada && active) ||
      (next === AppointmentStatus.completada && from === AppointmentStatus.confirmada && current.startsAt <= now);
    if (!allowed) {
      throw new BadRequestException(
        next === AppointmentStatus.completada && from === AppointmentStatus.confirmada
          ? 'Solo se puede completar una cita que ya empezó'
          : `No se puede pasar de "${from}" a "${next}"`,
      );
    }
  }

  // ─── Recordatorios ─────────────────────────────────────────────────────────

  /**
   * Recordatorio de las citas confirmadas de las próximas 24 h. Cada cita se
   * "reclama" con un update condicional: con varias instancias de la API, solo
   * una envía el recordatorio.
   */
  async sendReminders(now = new Date()): Promise<number> {
    const due = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.confirmada,
        reminderSentAt: null,
        startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
      },
      include: { ...appointmentInclude, tenant: { select: { name: true, timezone: true } } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });

    let sent = 0;
    for (const appt of due) {
      const { count } = await this.prisma.appointment.updateMany({
        where: { id: appt.id, reminderSentAt: null },
        data: { reminderSentAt: now },
      });
      if (count === 0) continue;

      await this.notifications.create({
        userId: appt.clientId,
        title: 'Recordatorio de cita',
        body: `Con ${appt.lawyer.name}: ${this.when(appt.startsAt, appt.tenant.timezone)}`,
        meta: { type: 'APPOINTMENT_REMINDER', appointmentId: appt.id },
      });
      await this.sendEmail('reminder', appt.client, appt.lawyer.name, appt, appt.tenant, false);
      sent++;
    }
    return sent;
  }

  // ─── Auxiliares ────────────────────────────────────────────────────────────

  private tenantSettings(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, timezone: true, appointmentMinutes: true },
    });
  }

  private async assertLawyer(lawyerId: string, tenantId: string): Promise<Person> {
    const lawyer = await this.prisma.user.findFirst({
      where: { id: lawyerId, tenantId, active: true, role: { in: [Role.ADMIN, Role.ABOGADO] } },
      select: { id: true, name: true, email: true },
    });
    if (!lawyer) throw new BadRequestException('Abogado no válido');
    return lawyer;
  }

  private async findClient(clientId: string | undefined, tenantId: string): Promise<Person> {
    if (!clientId) throw new BadRequestException('Elige un cliente');
    const client = await this.prisma.user.findFirst({
      where: { id: clientId, tenantId, active: true, role: Role.CLIENTE },
      select: { id: true, name: true, email: true },
    });
    if (!client) throw new BadRequestException('Cliente no válido');
    return client;
  }

  private async assertCase(caseId: string, clientId: string, actor: JwtPayloadUser) {
    const c = await this.prisma.case.findFirst({
      where: { id: caseId, tenantId: actor.tenantId, clientId },
      select: { lawyerId: true },
    });
    if (!c) throw new BadRequestException('El caso no corresponde a ese cliente');
    if (actor.role === Role.ABOGADO && c.lawyerId !== actor.id) {
      throw new ForbiddenException('Sin acceso a ese caso');
    }
  }

  /** El cliente solo puede reservar exactamente un hueco de la disponibilidad. */
  private async assertOfferedSlot(
    lawyerId: string,
    startsAt: Date,
    tenant: { timezone: string; appointmentMinutes: number },
    tenantId: string,
    now: Date,
  ) {
    const blocks = await this.prisma.availability.findMany({ where: { tenantId, lawyerId } });
    const offered = computeSlots({
      blocks,
      busy: [],
      fromYmd: localYmd(startsAt, tenant.timezone),
      days: 1,
      timeZone: tenant.timezone,
      slotMinutes: tenant.appointmentMinutes,
      now,
    });
    if (!offered.some((s) => s.startsAt.getTime() === startsAt.getTime())) {
      throw new BadRequestException('Ese horario no está dentro de la disponibilidad del abogado');
    }
  }

  private busy(lawyerId: string, from: Date, to: Date) {
    return this.prisma.appointment.findMany({
      where: {
        lawyerId,
        status: { in: ACTIVE_STATUSES },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { startsAt: true, endsAt: true },
    });
  }

  private when(at: Date, timeZone: string) {
    return new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(at);
  }

  /** Nunca lanza: un fallo de correo se registra y la operación sigue. */
  private async sendEmail(
    kind: AppointmentEmailKind,
    recipient: Person,
    counterpartName: string,
    appt: { startsAt: Date; reason: string | null; note: string | null },
    tenant: { name: string; timezone: string },
    recipientIsStaff: boolean,
  ) {
    try {
      const email = buildAppointmentEmail({
        kind,
        recipientName: recipient.name,
        tenantName: tenant.name,
        counterpartName,
        startsAt: appt.startsAt,
        timeZone: tenant.timezone,
        reason: appt.reason,
        note: appt.note,
        link: `${this.appUrl}${recipientIsStaff ? '/agenda' : '/portal/citas'}`,
      });
      await this.mail.send({ to: recipient.email, ...email });
    } catch (err) {
      this.logger.error(
        `No se pudo enviar el email "${kind}" a ${recipient.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
