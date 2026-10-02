import { BadRequestException } from '@nestjs/common';
import { Role, CaseStatus } from '@prisma/client';
import { CasesService } from './cases.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

describe('CasesService.findAll (guards por rol)', () => {
  let prisma: {
    case: { count: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: CasesService;

  const admin: JwtPayloadUser = {
    id: 'admin1',
    email: 'admin@demo.bogados',
    role: Role.ADMIN,
    tenantId: 't1',
    name: 'Admin',
  };
  const lawyer: JwtPayloadUser = {
    id: 'law1',
    email: 'abogado@demo.bogados',
    role: Role.ABOGADO,
    tenantId: 't1',
    name: 'Lawyer',
  };
  const client: JwtPayloadUser = {
    id: 'cli1',
    email: 'cliente@demo.bogados',
    role: Role.CLIENTE,
    tenantId: 't1',
    name: 'Client',
  };

  beforeEach(() => {
    prisma = {
      case: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'c1', title: 'Caso' }]),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new CasesService(
      prisma as never,
      { log: jest.fn() } as never,
      { notifyMany: jest.fn(), create: jest.fn() } as never,
    );
  });

  it('admin lista por tenant sin filtrar por lawyer/client', async () => {
    await service.findAll(admin, { page: 1, pageSize: 10 });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1' }),
      }),
    );
    const where = prisma.case.findMany.mock.calls[0][0].where;
    expect(where.lawyerId).toBeUndefined();
    expect(where.clientId).toBeUndefined();
  });

  it('abogado solo ve sus casos (lawyerId)', async () => {
    await service.findAll(lawyer, { page: 1, pageSize: 10 });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1',
          lawyerId: 'law1',
        }),
      }),
    );
  });

  it('cliente solo ve sus casos (clientId)', async () => {
    const result = await service.findAll(client, {
      page: 1,
      pageSize: 10,
      status: CaseStatus.abierto,
    });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1',
          clientId: 'cli1',
          status: CaseStatus.abierto,
        }),
      }),
    );
    expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(1);
  });
});

describe('CasesService.update (validación de lawyerId/clientId)', () => {
  let prisma: {
    case: { findFirst: jest.Mock; update: jest.Mock };
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let activity: { log: jest.Mock };
  let notifications: { notifyMany: jest.Mock; create: jest.Mock };
  let service: CasesService;

  const admin: JwtPayloadUser = {
    id: 'admin1',
    email: 'admin@demo.bogados',
    role: Role.ADMIN,
    tenantId: 't1',
    name: 'Admin',
  };
  const lawyer: JwtPayloadUser = {
    id: 'law1',
    email: 'abogado@demo.bogados',
    role: Role.ABOGADO,
    tenantId: 't1',
    name: 'Lawyer',
  };

  // Usuarios que existen en la BD simulada
  const users = [
    { id: 'law2', tenantId: 't1', role: Role.ABOGADO, active: true },
    { id: 'cli2', tenantId: 't1', role: Role.CLIENTE, active: true },
    { id: 'cliInactivo', tenantId: 't1', role: Role.CLIENTE, active: false },
    { id: 'lawOtroTenant', tenantId: 't2', role: Role.ABOGADO, active: true },
  ];

  beforeEach(() => {
    prisma = {
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'c1',
          tenantId: 't1',
          title: 'Caso',
          status: CaseStatus.abierto,
          lawyerId: 'law1',
          clientId: null,
        }),
        // Como Prisma: devuelve el caso completo con los cambios aplicados
        update: jest.fn(async ({ data }) => ({
          id: 'c1',
          title: 'Caso',
          lawyerId: 'law1',
          clientId: null,
          ...data,
        })),
      },
      user: {
        findFirst: jest.fn(async ({ where }) => {
          const roles: Role[] = where.role?.in ?? [where.role];
          return (
            users.find(
              (u) =>
                u.id === where.id &&
                u.tenantId === where.tenantId &&
                u.active === where.active &&
                roles.includes(u.role),
            ) ?? null
          );
        }),
      },
      // Transacción interactiva: el callback recibe el propio mock como `tx`
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    activity = { log: jest.fn() };
    notifications = { notifyMany: jest.fn(), create: jest.fn() };
    service = new CasesService(prisma as never, activity as never, notifications as never);
  });

  it('cambio de estado: actividad y notificaciones van en la misma transacción', async () => {
    await service.update('c1', { status: CaseStatus.cerrado }, admin);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'STATUS_CHANGED' }),
      prisma,
    );
    expect(notifications.notifyMany).toHaveBeenCalledWith(['law1'], expect.anything(), prisma);
  });

  it('si falla el registro de actividad, el error se propaga (la transacción se revierte)', async () => {
    activity.log.mockRejectedValueOnce(new Error('db caída'));
    await expect(service.update('c1', { status: CaseStatus.cerrado }, admin)).rejects.toThrow(
      'db caída',
    );
    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('admin puede asignar abogado y cliente válidos del tenant', async () => {
    await service.update('c1', { lawyerId: 'law2', clientId: 'cli2' }, admin);
    expect(prisma.case.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lawyerId: 'law2', clientId: 'cli2' }),
      }),
    );
  });

  it.each([
    ['un CLIENTE como abogado', { lawyerId: 'cli2' }],
    ['un abogado de otro tenant', { lawyerId: 'lawOtroTenant' }],
    ['un id inexistente como abogado', { lawyerId: 'nope' }],
    ['un ABOGADO como cliente', { clientId: 'law2' }],
    ['un cliente inactivo', { clientId: 'cliInactivo' }],
  ])('rechaza %s', async (_desc, dto) => {
    await expect(service.update('c1', dto, admin)).rejects.toThrow(BadRequestException);
    expect(prisma.case.update).not.toHaveBeenCalled();
  });

  it('null desasigna sin validar', async () => {
    await service.update('c1', { clientId: null }, admin);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.case.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clientId: null }) }),
    );
  });

  it('una solicitud del portal abierta no cambia de estado a mano', async () => {
    prisma.case.findFirst.mockResolvedValueOnce({
      id: 'c1',
      tenantId: 't1',
      title: 'Caso',
      status: CaseStatus.intake,
      lawyerId: null,
      clientId: 'cli2',
      requestState: 'pendiente',
    });
    await expect(service.update('c1', { status: CaseStatus.abierto }, admin)).rejects.toThrow(
      'acepta, aplaza o rechaza',
    );
    expect(prisma.case.update).not.toHaveBeenCalled();
  });

  it('abogado no puede cambiar lawyerId/clientId (se ignoran)', async () => {
    await service.update('c1', { title: 'Nuevo', lawyerId: 'lawOtroTenant' }, lawyer);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    const data = prisma.case.update.mock.calls[0][0].data;
    expect(data.title).toBe('Nuevo');
    expect(data).not.toHaveProperty('lawyerId');
  });
});
