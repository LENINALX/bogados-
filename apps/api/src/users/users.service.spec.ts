import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

const admin: JwtPayloadUser = { id: 'admin1', role: Role.ADMIN, tenantId: 't1', email: 'admin@x.ec', name: 'Admin' };

function setup(taken: { id: string } | null) {
  const prisma = {
    user: {
      findFirst: jest.fn(async ({ where }) =>
        where.NOT ? taken : { id: where.id, email: 'old@x.ec', role: Role.ABOGADO, active: true },
      ),
      update: jest.fn(async ({ data }) => ({ id: 'u2', ...data })),
    },
  };
  return { prisma, service: new UsersService(prisma as never, {} as never) };
}

describe('UsersService.update (email)', () => {
  it('un email ya usado en la firma es un 409 claro', async () => {
    const { prisma, service } = setup({ id: 'u3' });
    await expect(service.update('u2', { email: 'otro@x.ec' }, admin)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('busca el duplicado solo en la firma del admin y excluye al propio usuario', async () => {
    const { prisma, service } = setup(null);
    await service.update('u2', { email: 'Nuevo@X.ec' }, admin);
    const where = prisma.user.findFirst.mock.calls.find(([a]) => a.where.NOT)![0].where;
    expect(where).toEqual({ tenantId: 't1', email: 'nuevo@x.ec', NOT: { id: 'u2' } });
    expect(prisma.user.update.mock.calls[0][0].data.email).toBe('nuevo@x.ec');
  });
});
