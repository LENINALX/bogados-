import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CaseRequestState, Role } from '@prisma/client';
import { CaseRequestsService, MAX_OPEN_REQUESTS } from './case-requests.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

const client: JwtPayloadUser = { id: 'cli1', role: Role.CLIENTE, name: 'Carla', email: 'carla@x.com', tenantId: 't1' };
const admin: JwtPayloadUser = { id: 'adm1', role: Role.ADMIN, name: 'Ana', email: 'ana@x.com', tenantId: 't1' };

function setup() {
  const prisma = {
    case: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }) => ({ id: 'c1', ...data, lawyer: null })),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'c1' }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'adm1', name: 'Ana', email: 'ana@x.com' },
        { id: 'adm2', name: 'Alba', email: 'alba@x.com' },
      ]),
      findFirst: jest.fn(async ({ where }) =>
        ['law1', 'adm1'].includes(where.id) ? { id: where.id, name: 'Luis', email: 'luis@x.com' } : null,
      ),
    },
    tenant: { findUniqueOrThrow: jest.fn().mockResolvedValue({ name: 'Firma Demo' }) },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const activity = { log: jest.fn() };
  const notifications = { create: jest.fn(), notifyMany: jest.fn() };
  const mail = { send: jest.fn() };
  const config = { get: (k: string, d?: unknown) => (k === 'appUrl' ? 'https://app.test' : d) };
  const service = new CaseRequestsService(
    prisma as never,
    activity as never,
    notifications as never,
    mail as never,
    config as never,
  );
  return { prisma, activity, notifications, mail, service };
}

const dto = { title: 'Despido', matterType: 'Laboral', description: 'Me despidieron sin liquidación.' };

describe('CaseRequestsService.create', () => {
  it('crea el caso en intake, sin abogado, con la solicitud pendiente', async () => {
    const t = setup();
    await t.service.create(dto, client);
    expect(t.prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          clientId: 'cli1',
          status: 'intake',
          requestState: 'pendiente',
        }),
      }),
    );
    expect(t.prisma.case.create.mock.calls[0][0].data).not.toHaveProperty('lawyerId');
    expect(t.activity.log).toHaveBeenCalledWith(expect.objectContaining({ type: 'CASE_REQUESTED' }), t.prisma);
  });

  it('avisa a todos los admins (in-app en la transacción + email) y confirma al cliente', async () => {
    const t = setup();
    await t.service.create(dto, client);
    expect(t.notifications.notifyMany).toHaveBeenCalledWith(['adm1', 'adm2'], expect.anything(), t.prisma);
    const to = t.mail.send.mock.calls.map((c) => c[0].to);
    expect(to).toEqual(['carla@x.com', 'ana@x.com', 'alba@x.com']);
    expect(t.mail.send.mock.calls[0][0].text).toContain('https://app.test/portal/casos/c1');
    expect(t.mail.send.mock.calls[1][0].text).toContain('https://app.test/casos/c1');
  });

  it(`máximo ${MAX_OPEN_REQUESTS} solicitudes abiertas`, async () => {
    const t = setup();
    t.prisma.case.count.mockResolvedValue(MAX_OPEN_REQUESTS);
    await expect(t.service.create(dto, client)).rejects.toThrow(BadRequestException);
    expect(t.prisma.case.create).not.toHaveBeenCalled();
  });
});

describe('CaseRequestsService.decide', () => {
  const request = (state: CaseRequestState | null = CaseRequestState.pendiente) => ({
    id: 'c1',
    title: 'Despido',
    requestState: state,
    client: { id: 'cli1', name: 'Carla', email: 'carla@x.com' },
  });

  it('aceptar: abre el caso, asigna abogado y avisa a cliente y abogado', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request());
    await t.service.decide('c1', { decision: 'aceptar', lawyerId: 'law1' }, admin);
    expect(t.prisma.case.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', requestState: 'pendiente' },
      data: expect.objectContaining({ requestState: 'aceptada', status: 'abierto', lawyerId: 'law1', decidedById: 'adm1' }),
    });
    const notified = t.notifications.create.mock.calls.map((c) => c[0].userId);
    expect(notified).toEqual(['cli1', 'law1']);
    expect(t.mail.send.mock.calls[0][0].subject).toContain('aceptado');
  });

  it('aceptar sin abogado → se asigna a quien acepta (y no se auto-notifica)', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request());
    await t.service.decide('c1', { decision: 'aceptar' }, admin);
    expect(t.prisma.case.updateMany.mock.calls[0][0].data.lawyerId).toBe('adm1');
    expect(t.notifications.create.mock.calls.map((c) => c[0].userId)).toEqual(['cli1']);
  });

  it('aceptar con un abogado no válido → 400', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request());
    await expect(t.service.decide('c1', { decision: 'aceptar', lawyerId: 'cli1' }, admin)).rejects.toThrow(
      'Abogado no válido',
    );
  });

  it('rechazar exige motivo y cierra el caso', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request());
    await expect(t.service.decide('c1', { decision: 'rechazar' }, admin)).rejects.toThrow('motivo');
    await expect(t.service.decide('c1', { decision: 'rechazar', reason: ' no ' }, admin)).rejects.toThrow('motivo');

    await t.service.decide('c1', { decision: 'rechazar', reason: 'No llevamos esa materia' }, admin);
    expect(t.prisma.case.updateMany.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ requestState: 'rechazada', status: 'cerrado', decisionReason: 'No llevamos esa materia' }),
    );
    expect(t.mail.send.mock.calls[0][0].text).toContain('Motivo: No llevamos esa materia');
  });

  it('aplazar mantiene el caso en intake y luego se puede aceptar', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request());
    await t.service.decide('c1', { decision: 'aplazar', reason: 'Esperamos documentos' }, admin);
    const data = t.prisma.case.updateMany.mock.calls[0][0].data;
    expect(data.requestState).toBe('aplazada');
    expect(data).not.toHaveProperty('status');

    t.prisma.case.findFirst.mockResolvedValue(request(CaseRequestState.aplazada));
    await t.service.decide('c1', { decision: 'aceptar' }, admin);
    expect(t.prisma.case.updateMany.mock.calls[1][0].where).toEqual({ id: 'c1', requestState: 'aplazada' });
  });

  it.each([CaseRequestState.aceptada, CaseRequestState.rechazada])('una solicitud %s ya no se decide', async (s) => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request(s));
    await expect(t.service.decide('c1', { decision: 'aceptar' }, admin)).rejects.toThrow('ya fue decidida');
  });

  it('un caso creado por el despacho (sin solicitud) → 404', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request(null));
    await expect(t.service.decide('c1', { decision: 'aceptar' }, admin)).rejects.toThrow(NotFoundException);
  });

  it('dos admins a la vez → el segundo recibe 409 y no se envía nada', async () => {
    const t = setup();
    t.prisma.case.findFirst.mockResolvedValue(request());
    t.prisma.case.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(t.service.decide('c1', { decision: 'aceptar' }, admin)).rejects.toThrow(ConflictException);
    expect(t.mail.send).not.toHaveBeenCalled();
    expect(t.activity.log).not.toHaveBeenCalled();
  });
});
