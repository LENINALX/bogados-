import { BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import {
  AppointmentsService,
  MAX_ACTIVE_PER_CLIENT,
  SLOT_TAKEN_MESSAGE,
} from './appointments.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

const NOW = new Date('2026-10-01T12:00:00Z'); // jueves
const MONDAY_9 = '2026-10-05T14:00:00.000Z'; // lunes 09:00 en Guayaquil (hueco válido)
const MONDAY_830 = '2026-10-05T13:30:00.000Z'; // fuera de la disponibilidad

const user = (id: string, role: Role, name = id): JwtPayloadUser => ({
  id,
  role,
  name,
  email: `${id}@demo.bogados`,
  tenantId: 't1',
});
const admin = user('admin1', Role.ADMIN, 'Ana');
const lawyer = user('law1', Role.ABOGADO, 'Luis');
const otherLawyer = user('law2', Role.ABOGADO, 'Laura');
const client = user('cli1', Role.CLIENTE, 'Carla');

const people: Record<string, { id: string; name: string; email: string; role: Role }> = {
  admin1: { id: 'admin1', name: 'Ana', email: 'admin1@demo.bogados', role: Role.ADMIN },
  law1: { id: 'law1', name: 'Luis', email: 'law1@demo.bogados', role: Role.ABOGADO },
  law2: { id: 'law2', name: 'Laura', email: 'law2@demo.bogados', role: Role.ABOGADO },
  cli1: { id: 'cli1', name: 'Carla', email: 'cli1@demo.bogados', role: Role.CLIENTE },
};

function setup() {
  const prisma = {
    tenant: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        name: 'Firma Demo',
        timezone: 'America/Guayaquil',
        appointmentMinutes: 60,
      }),
    },
    user: {
      findFirst: jest.fn(async ({ where }) => {
        const p = people[where.id];
        const roles: Role[] = where.role?.in ?? [where.role];
        return p && roles.includes(p.role) ? { id: p.id, name: p.name, email: p.email } : null;
      }),
    },
    availability: {
      // Lunes 09:00–12:00
      findMany: jest.fn().mockResolvedValue([{ weekday: 1, startMin: 540, endMin: 720 }]),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    appointment: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }) => ({
        id: 'a1',
        ...data,
        note: null,
        lawyer: people[data.lawyerId],
        client: people[data.clientId],
        case: null,
      })),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    case: { findFirst: jest.fn() },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
    ),
  };
  const notifications = { create: jest.fn() };
  const mail = { send: jest.fn() };
  const config = { get: (k: string, d?: unknown) => (k === 'appUrl' ? 'https://app.test' : d) };
  const service = new AppointmentsService(
    prisma as never,
    notifications as never,
    mail as never,
    config as never,
  );
  return { prisma, notifications, mail, service };
}

describe('AppointmentsService', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  describe('setAvailability', () => {
    const blocks = [{ weekday: 1, start: '09:00', end: '13:00' }];

    it('un abogado no puede editar la disponibilidad de otro', async () => {
      await expect(t.service.setAvailability('law1', { blocks }, otherLawyer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza franjas solapadas', async () => {
      const bad = [...blocks, { weekday: 1, start: '12:00', end: '14:00' }];
      await expect(t.service.setAvailability('law1', { blocks: bad }, lawyer)).rejects.toThrow(
        BadRequestException,
      );
      expect(t.prisma.availability.deleteMany).not.toHaveBeenCalled();
    });

    it('reemplaza la disponibilidad en una transacción (minutos locales)', async () => {
      await t.service.setAvailability('law1', { blocks }, lawyer);
      expect(t.prisma.availability.createMany).toHaveBeenCalledWith({
        data: [{ weekday: 1, startMin: 540, endMin: 780, tenantId: 't1', lawyerId: 'law1' }],
      });
    });
  });

  describe('slots', () => {
    it('ofrece los huecos libres en UTC y descuenta los ocupados', async () => {
      t.prisma.appointment.findMany.mockResolvedValue([
        { startsAt: new Date('2026-10-05T15:00:00Z'), endsAt: new Date('2026-10-05T16:00:00Z') },
      ]);
      const res = await t.service.slots({ lawyerId: 'law1', days: 7 }, client, NOW);
      expect(res.timeZone).toBe('America/Guayaquil');
      expect(res.slots.map((s) => s.startsAt)).toEqual([MONDAY_9, '2026-10-05T16:00:00.000Z']);
    });

    it('no ofrece días pasados aunque se pidan', async () => {
      const res = await t.service.slots({ lawyerId: 'law1', from: '2026-09-01', days: 1 }, client, NOW);
      expect(res.slots).toEqual([]); // empieza "hoy" (jueves), sin disponibilidad
    });
  });

  describe('create (cliente)', () => {
    it('crea la cita pendiente, avisa al abogado y le envía email con enlace a la agenda', async () => {
      const appt = await t.service.create({ lawyerId: 'law1', startsAt: MONDAY_9, reason: 'Divorcio' }, client, NOW);
      expect(appt.status).toBe(AppointmentStatus.pendiente);
      expect(appt.endsAt.toISOString()).toBe('2026-10-05T15:00:00.000Z');
      expect(t.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(t.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'law1', title: 'Nueva solicitud de cita' }),
        t.prisma,
      );
      const email = t.mail.send.mock.calls[0][0];
      expect(email.to).toBe('law1@demo.bogados');
      expect(email.text).toContain('https://app.test/agenda');
      expect(email.text).toContain('Motivo: Divorcio');
    });

    it('exige elegir abogado', async () => {
      await expect(t.service.create({ startsAt: MONDAY_9 }, client, NOW)).rejects.toThrow('Elige un abogado');
    });

    it('solo puede reservar huecos de la disponibilidad', async () => {
      await expect(t.service.create({ lawyerId: 'law1', startsAt: MONDAY_830 }, client, NOW)).rejects.toThrow(
        'disponibilidad',
      );
    });

    it('no puede elegir duración propia (se usa la de la firma)', async () => {
      const appt = await t.service.create(
        { lawyerId: 'law1', startsAt: MONDAY_9, durationMinutes: 480 },
        client,
        NOW,
      );
      expect(appt.endsAt.getTime() - appt.startsAt.getTime()).toBe(60 * 60_000);
    });

    it(`máximo ${MAX_ACTIVE_PER_CLIENT} citas activas a la vez`, async () => {
      t.prisma.appointment.count.mockResolvedValueOnce(MAX_ACTIVE_PER_CLIENT);
      await expect(t.service.create({ lawyerId: 'law1', startsAt: MONDAY_9 }, client, NOW)).rejects.toThrow(
        'Cancela alguna',
      );
    });

    it('hueco ya ocupado (comprobado dentro de la transacción) → 409', async () => {
      t.prisma.appointment.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      await expect(t.service.create({ lawyerId: 'law1', startsAt: MONDAY_9 }, client, NOW)).rejects.toThrow(
        SLOT_TAKEN_MESSAGE,
      );
      expect(t.prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('conflicto de serialización de Postgres (P2034) → 409 con el mismo mensaje', async () => {
      t.prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('write conflict', { code: 'P2034', clientVersion: 'x' }),
      );
      await expect(t.service.create({ lawyerId: 'law1', startsAt: MONDAY_9 }, client, NOW)).rejects.toThrow(
        ConflictException,
      );
    });

    it('no puede vincular un caso que no es suyo', async () => {
      t.prisma.case.findFirst.mockResolvedValue(null);
      await expect(
        t.service.create({ lawyerId: 'law1', startsAt: MONDAY_9, caseId: 'ajeno' }, client, NOW),
      ).rejects.toThrow('no corresponde');
    });

    it('si el email falla, la cita queda creada igualmente', async () => {
      const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      t.mail.send.mockRejectedValueOnce(new Error('SMTP caído'));
      await expect(t.service.create({ lawyerId: 'law1', startsAt: MONDAY_9 }, client, NOW)).resolves.toMatchObject({
        id: 'a1',
      });
      expect(logError).toHaveBeenCalled();
      logError.mockRestore();
    });
  });

  describe('create (despacho)', () => {
    it('la cita nace confirmada, en cualquier horario futuro, y el cliente recibe el email', async () => {
      const appt = await t.service.create({ clientId: 'cli1', startsAt: MONDAY_830, durationMinutes: 30 }, lawyer, NOW);
      expect(appt.status).toBe(AppointmentStatus.confirmada);
      expect(appt.lawyerId).toBe('law1');
      expect(appt.endsAt.toISOString()).toBe('2026-10-05T14:00:00.000Z');
      const email = t.mail.send.mock.calls[0][0];
      expect(email.to).toBe('cli1@demo.bogados');
      expect(email.text).toContain('https://app.test/portal/citas');
    });

    it('exige cliente válido', async () => {
      await expect(t.service.create({ startsAt: MONDAY_9 }, lawyer, NOW)).rejects.toThrow('Elige un cliente');
      await expect(t.service.create({ clientId: 'law2', startsAt: MONDAY_9 }, lawyer, NOW)).rejects.toThrow(
        'Cliente no válido',
      );
    });

    it('un abogado no crea citas en la agenda de otro', async () => {
      await expect(
        t.service.create({ clientId: 'cli1', lawyerId: 'law2', startsAt: MONDAY_9 }, lawyer, NOW),
      ).rejects.toThrow(ForbiddenException);
    });

    it('el admin sí puede crear en la agenda de cualquier abogado', async () => {
      const appt = await t.service.create({ clientId: 'cli1', lawyerId: 'law2', startsAt: MONDAY_9 }, admin, NOW);
      expect(appt.lawyerId).toBe('law2');
    });

    it('no se crean citas en el pasado', async () => {
      await expect(
        t.service.create({ clientId: 'cli1', startsAt: '2026-09-30T14:00:00Z' }, lawyer, NOW),
      ).rejects.toThrow('futuro');
    });
  });

  describe('updateStatus', () => {
    const future = {
      id: 'a1',
      status: AppointmentStatus.pendiente,
      startsAt: new Date(MONDAY_9),
      note: null,
      reason: null,
      lawyer: people.law1,
      client: people.cli1,
      case: null,
    };

    beforeEach(() => {
      t.prisma.appointment.findFirst.mockResolvedValue(future);
      t.prisma.appointment.findUniqueOrThrow.mockImplementation(async () => ({ ...future, status: 'x' }));
    });

    it('el cliente solo ve sus citas (filtro por clientId)', async () => {
      await t.service.updateStatus('a1', { status: 'cancelada' }, client, NOW);
      expect(t.prisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1', tenantId: 't1', clientId: 'cli1' } }),
      );
    });

    it('el cliente no puede confirmar', async () => {
      await expect(t.service.updateStatus('a1', { status: 'confirmada' }, client, NOW)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('el cliente cancela una cita futura → avisa al abogado (enlace a la agenda)', async () => {
      await t.service.updateStatus('a1', { status: 'cancelada', note: 'Me surgió un viaje' }, client, NOW);
      expect(t.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'law1', title: 'Cita cancelada' }),
        t.prisma,
      );
      expect(t.mail.send.mock.calls[0][0].text).toContain('/agenda');
    });

    it('el cliente no puede cancelar una cita que ya empezó', async () => {
      const after = new Date('2026-10-05T14:30:00Z');
      await expect(t.service.updateStatus('a1', { status: 'cancelada' }, client, after)).rejects.toThrow(
        'ya no se puede',
      );
    });

    it('el abogado confirma una pendiente → avisa y envía email al cliente', async () => {
      await t.service.updateStatus('a1', { status: 'confirmada', note: 'Trae tu cédula' }, lawyer, NOW);
      expect(t.prisma.appointment.updateMany).toHaveBeenCalledWith({
        where: { id: 'a1', status: 'pendiente' },
        data: { status: 'confirmada', note: 'Trae tu cédula' },
      });
      expect(t.mail.send.mock.calls[0][0].to).toBe('cli1@demo.bogados');
    });

    it('no se puede completar una cita pendiente ni una que no ha empezado', async () => {
      await expect(t.service.updateStatus('a1', { status: 'completada' }, lawyer, NOW)).rejects.toThrow(
        BadRequestException,
      );
      t.prisma.appointment.findFirst.mockResolvedValue({ ...future, status: AppointmentStatus.confirmada });
      await expect(t.service.updateStatus('a1', { status: 'completada' }, lawyer, NOW)).rejects.toThrow(
        'ya empezó',
      );
    });

    it('completar no notifica a nadie', async () => {
      t.prisma.appointment.findFirst.mockResolvedValue({ ...future, status: AppointmentStatus.confirmada });
      await t.service.updateStatus('a1', { status: 'completada' }, lawyer, new Date('2026-10-05T15:30:00Z'));
      expect(t.notifications.create).not.toHaveBeenCalled();
      expect(t.mail.send).not.toHaveBeenCalled();
    });

    it('una cita cancelada no vuelve a cambiar', async () => {
      t.prisma.appointment.findFirst.mockResolvedValue({ ...future, status: AppointmentStatus.cancelada });
      await expect(t.service.updateStatus('a1', { status: 'confirmada' }, lawyer, NOW)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('si otro la cambió entre medias → 409 y no se notifica', async () => {
      t.prisma.appointment.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(t.service.updateStatus('a1', { status: 'confirmada' }, lawyer, NOW)).rejects.toThrow(
        ConflictException,
      );
      expect(t.mail.send).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders', () => {
    const appt = (id: string) => ({
      id,
      clientId: 'cli1',
      startsAt: new Date(MONDAY_9),
      reason: null,
      note: null,
      lawyer: people.law1,
      client: people.cli1,
      tenant: { name: 'Firma Demo', timezone: 'America/Guayaquil' },
    });

    it('busca confirmadas sin recordatorio en las próximas 24 h y envía uno por cita', async () => {
      t.prisma.appointment.findMany.mockResolvedValue([appt('a1'), appt('a2')]);
      const now = new Date('2026-10-04T15:00:00Z');
      await expect(t.service.sendReminders(now)).resolves.toBe(2);
      expect(t.prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'confirmada',
            reminderSentAt: null,
            startsAt: { gt: now, lte: new Date('2026-10-05T15:00:00Z') },
          },
        }),
      );
      expect(t.mail.send).toHaveBeenCalledTimes(2);
      expect(t.mail.send.mock.calls[0][0].subject).toContain('Recordatorio');
    });

    it('si otra instancia ya la reclamó, no la envía', async () => {
      t.prisma.appointment.findMany.mockResolvedValue([appt('a1'), appt('a2')]);
      t.prisma.appointment.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
      await expect(t.service.sendReminders(NOW)).resolves.toBe(1);
      expect(t.mail.send).toHaveBeenCalledTimes(1);
    });
  });
});
