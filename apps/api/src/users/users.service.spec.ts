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
    userToken: { deleteMany: jest.fn() },
    loginChallenge: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
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

describe('UsersService.update (enlaces pendientes)', () => {
  it('al cambiar el email, los enlaces y códigos enviados al correo anterior dejan de valer', async () => {
    const { prisma, service } = setup(null);
    await service.update('u2', { email: 'nuevo@x.ec' }, admin);
    expect(prisma.userToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u2', usedAt: null } });
    expect(prisma.loginChallenge.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u2', consumedAt: null } });
  });

  it('al poner el admin una contraseña nueva, también', async () => {
    const { prisma, service } = setup(null);
    await service.update('u2', { password: 'temporal-nueva' }, admin);
    expect(prisma.userToken.deleteMany).toHaveBeenCalled();
  });

  it('cambiar solo el nombre o volver a poner el mismo email no toca los enlaces', async () => {
    const { prisma, service } = setup(null);
    await service.update('u2', { name: 'Otro nombre' }, admin);
    await service.update('u2', { email: 'OLD@x.ec' }, admin);
    expect(prisma.userToken.deleteMany).not.toHaveBeenCalled();
  });
});
