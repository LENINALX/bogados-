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
