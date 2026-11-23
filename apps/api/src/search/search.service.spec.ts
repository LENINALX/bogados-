import { Role } from '@prisma/client';
import { SearchService, SEARCH_GROUP_LIMIT } from './search.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

describe('SearchService (ámbito por rol)', () => {
  let prisma: {
    case: { findMany: jest.Mock };
    document: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let service: SearchService;

  const user = (role: Role, id = 'u1'): JwtPayloadUser => ({
    id,
    email: `${id}@demo.bogados`,
    role,
    tenantId: 't1',
    name: id,
  });

  beforeEach(() => {
    prisma = {
      case: { findMany: jest.fn().mockResolvedValue([]) },
      document: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new SearchService(prisma as never);
  });

  it('no consulta la base de datos con menos de 2 caracteres', async () => {
    const res = await service.search(user(Role.ADMIN), ' a ');
    expect(res.cases.items).toEqual([]);
    expect(prisma.case.findMany).not.toHaveBeenCalled();
    expect(prisma.document.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('admin: busca en toda la firma, también por cliente, y busca clientes', async () => {
    await service.search(user(Role.ADMIN), 'perez');
    const caseWhere = prisma.case.findMany.mock.calls[0][0].where;
    expect(caseWhere.tenantId).toBe('t1');
    expect(caseWhere.lawyerId).toBeUndefined();
    expect(caseWhere.OR).toEqual(expect.arrayContaining([{ client: { name: expect.anything() } }]));
    const userWhere = prisma.user.findMany.mock.calls[0][0].where;
    expect(userWhere).toMatchObject({ tenantId: 't1', role: Role.CLIENTE });
    expect(userWhere.casesAsClient).toBeUndefined();
  });

  it('abogado: solo sus casos, documentos de sus casos y clientes de sus casos', async () => {
    await service.search(user(Role.ABOGADO, 'law1'), 'contrato');
    expect(prisma.case.findMany.mock.calls[0][0].where.lawyerId).toBe('law1');
    expect(prisma.document.findMany.mock.calls[0][0].where.case).toMatchObject({ lawyerId: 'law1' });
    expect(prisma.user.findMany.mock.calls[0][0].where.casesAsClient).toEqual({ some: { lawyerId: 'law1' } });
  });

  it('cliente: solo sus casos y documentos compartidos; nunca busca clientes', async () => {
    const res = await service.search(user(Role.CLIENTE, 'cli1'), 'contrato');
    const caseWhere = prisma.case.findMany.mock.calls[0][0].where;
    expect(caseWhere.clientId).toBe('cli1');
    // El cliente no busca por nombre de cliente
    expect(JSON.stringify(caseWhere.OR)).not.toContain('client');
    const docWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(docWhere.sharedWithClient).toBe(true);
    expect(docWhere.case).toMatchObject({ clientId: 'cli1' });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(res.clients.items).toEqual([]);
  });

  it('limita cada grupo e indica si hay más', async () => {
    const rows = Array.from({ length: SEARCH_GROUP_LIMIT + 1 }, (_, i) => ({ id: `c${i}` }));
    prisma.case.findMany.mockResolvedValue(rows);
    const res = await service.search(user(Role.ADMIN), 'caso');
    expect(res.cases.items).toHaveLength(SEARCH_GROUP_LIMIT);
    expect(res.cases.hasMore).toBe(true);
    expect(res.documents.hasMore).toBe(false);
  });

  it('expone el último caso y el número de casos de cada cliente', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'cli1', name: 'Ana', email: 'ana@x.ec', active: true, casesAsClient: [{ id: 'k1', title: 'Desalojo' }], _count: { casesAsClient: 3 } },
    ]);
    const res = await service.search(user(Role.ADMIN), 'ana');
    expect(res.clients.items[0]).toEqual({
      id: 'cli1',
      name: 'Ana',
      email: 'ana@x.ec',
      active: true,
      caseCount: 3,
      latestCase: { id: 'k1', title: 'Desalojo' },
    });
  });
});
