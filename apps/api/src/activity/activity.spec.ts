import { Role } from '@prisma/client';
import { ActivityService, isVisibleToClient } from './activity.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

const ev = (id: string, type: string, meta: Record<string, unknown> | null = null) => ({ id, type, meta });

const events = [
  ev('e1', 'CASE_CREATED'),
  ev('e2', 'DOC_UPLOADED', { documentId: 'd1', sharedWithClient: true }),
  ev('e3', 'DOC_UPLOADED', { documentId: 'd2', sharedWithClient: false }),
  ev('e4', 'NOTE_ADDED', { noteId: 'n1', isInternal: true }),
  ev('e5', 'NOTE_ADDED', { noteId: 'n2', isInternal: false }),
  ev('e6', 'STATUS_CHANGED', { from: 'intake', to: 'abierto' }),
  ev('e7', 'TIPO_NUEVO_INTERNO'),
];

const user = (role: Role): JwtPayloadUser => ({ id: 'u1', role, tenantId: 't1', email: 'u@x.ec', name: 'U' });

function setup() {
  const prisma = {
    case: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }) },
    activityEvent: { findMany: jest.fn().mockResolvedValue(events) },
  };
  return { prisma, service: new ActivityService(prisma as never) };
}

describe('ActivityService.timeline', () => {
  it('el cliente no ve documentos internos (ni su nombre), notas internas ni tipos fuera de la lista', async () => {
    const { service } = setup();
    const ids = (await service.timeline('c1', user(Role.CLIENTE))).map((e) => e.id);
    expect(ids).toEqual(['e1', 'e2', 'e5', 'e6']);
  });

  it('el despacho lo ve todo', async () => {
    const { service } = setup();
    expect(await service.timeline('c1', user(Role.ABOGADO))).toHaveLength(events.length);
  });

  it('solo consulta eventos del caso y de la firma del usuario', async () => {
    const { prisma, service } = setup();
    await service.timeline('c1', user(Role.ADMIN));
    expect(prisma.activityEvent.findMany.mock.calls[0][0].where).toEqual({ caseId: 'c1', tenantId: 't1' });
  });
});

describe('isVisibleToClient', () => {
  it('una nota sin meta (antigua) no se muestra por si acaso era interna', () => {
    expect(isVisibleToClient({ type: 'NOTE_ADDED', meta: null })).toBe(false);
  });

  it('un documento sin meta no se muestra', () => {
    expect(isVisibleToClient({ type: 'DOC_UPLOADED', meta: null })).toBe(false);
  });
});

describe('ActivityService.listForTenant (Admin › Actividad)', () => {
  const setup = () => {
    const prisma = {
      tenant: { findUniqueOrThrow: jest.fn().mockResolvedValue({ timezone: 'America/Guayaquil' }) },
      activityEvent: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
    };
    return { prisma, service: new ActivityService(prisma as never) };
  };

  it('solo la firma propia, con filtros por grupo y persona', async () => {
    const { prisma, service } = setup();
    await service.listForTenant('t1', { category: 'citas', actorId: 'u9' });
    const where = prisma.activityEvent.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      tenantId: 't1',
      actorId: 'u9',
      type: { in: ['APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED'] },
    });
  });

  it('las fechas son días enteros en la hora de la firma, «hasta» incluido', async () => {
    const { prisma, service } = setup();
    await service.listForTenant('t1', { from: '2026-11-01', to: '2026-11-11' });
    const { createdAt } = prisma.activityEvent.findMany.mock.calls[0][0].where;
    // Guayaquil es UTC−5
    expect(createdAt.gte.toISOString()).toBe('2026-11-01T05:00:00.000Z');
    expect(createdAt.lt.toISOString()).toBe('2026-11-12T05:00:00.000Z');
  });

  it('pagina y devuelve el total', async () => {
    const { prisma, service } = setup();
    prisma.activityEvent.count.mockResolvedValue(45);
    const res = await service.listForTenant('t1', { page: 3, pageSize: 20 });
    expect(prisma.activityEvent.findMany.mock.calls[0][0]).toMatchObject({ skip: 40, take: 20 });
    expect(res.meta).toMatchObject({ total: 45, page: 3, pageSize: 20 });
  });
});
