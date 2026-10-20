import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

describe('TenantsService (aislamiento por tenant)', () => {
  let prisma: {
    tenant: { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };
  let service: TenantsService;

  const admin: JwtPayloadUser = {
    id: 'admin1',
    email: 'admin@demo.bogados',
    role: Role.ADMIN,
    tenantId: 't1',
    name: 'Admin',
  };

  beforeEach(() => {
    prisma = {
      tenant: {
        findMany: jest.fn().mockResolvedValue([{ id: 't1' }]),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          name: 'Firma',
          slug: 'firma',
        })),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      },
    };
    service = new TenantsService(prisma as never);
  });

  it('findAll solo devuelve el tenant propio', async () => {
    await service.findAll(admin);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('findOne del tenant propio funciona', async () => {
    await expect(service.findOne('t1', admin)).resolves.toMatchObject({ id: 't1' });
  });

  it('findOne de otro tenant responde 404 sin consultar la BD', async () => {
    await expect(service.findOne('t2', admin)).rejects.toThrow(NotFoundException);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('update de otro tenant responde 404 y no modifica nada', async () => {
    await expect(service.update('t2', { name: 'Hackeada' }, admin)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });

  it('update del tenant propio aplica los cambios', async () => {
    await service.update('t1', { name: 'Nuevo nombre' }, admin);
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { name: 'Nuevo nombre' },
    });
  });
});

describe('TenantsService.findPublic', () => {
  const setupPublic = () => {
    const prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ name: 'Firma Demo', slug: 'firma-demo' }) } };
    return { prisma, service: new TenantsService(prisma as never) };
  };

  it('normaliza el código y lo busca', async () => {
    const { prisma, service } = setupPublic();
    await expect(service.findPublic('  Firma-Demo ')).resolves.toEqual({ name: 'Firma Demo', slug: 'firma-demo' });
    expect(prisma.tenant.findUnique.mock.calls[0][0].where).toEqual({ slug: 'firma-demo' });
  });

  it.each(['x'.repeat(61), 'con espacio', "a'; DROP TABLE", '../admin', ''])(
    'un código imposible («%s») es 404 sin consultar la BD',
    async (slug) => {
      const { prisma, service } = setupPublic();
      await expect(service.findPublic(slug)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    },
  );
});
