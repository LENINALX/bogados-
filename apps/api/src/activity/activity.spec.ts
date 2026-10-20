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
