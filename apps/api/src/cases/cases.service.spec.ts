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
