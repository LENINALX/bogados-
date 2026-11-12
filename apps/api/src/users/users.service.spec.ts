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
    activityEvent: { create: jest.fn() },
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

describe('UsersService: actividad de la firma', () => {
  it('cambiar el rol queda registrado con antes y después; la contraseña nunca aparece', async () => {
    const { prisma, service } = setup(null);
    prisma.user.findFirst.mockImplementation(async ({ where }) =>
      where.NOT ? null : { id: where.id, name: 'Nombre', email: 'old@x.ec', role: Role.ABOGADO, active: true },
    );
    prisma.user.update.mockImplementation(async ({ data }) => ({ id: 'u2', name: 'Nombre', ...data }));
    await service.update('u2', { role: Role.ADMIN, password: 'nueva-clave-1' }, admin);
    const data = prisma.activityEvent.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ tenantId: 't1', caseId: null, actorId: 'admin1', type: 'USER_UPDATED' });
    expect(data.summary).toBe('Usuario editado: Nombre (rol: Abogado → Admin; contraseña restablecida)');
    expect(JSON.stringify(data)).not.toContain('nueva-clave-1');
  });

  it('desactivar es su propio tipo; volver a poner lo mismo no registra nada', async () => {
    const { prisma, service } = setup(null);
    prisma.user.findFirst.mockImplementation(async ({ where }) =>
      where.NOT ? null : { id: where.id, name: 'Nombre', email: 'old@x.ec', role: Role.ABOGADO, active: true },
    );
    prisma.user.update.mockImplementation(async ({ data }) => ({ id: 'u2', name: 'Nombre', ...data }));
    await service.update('u2', { active: false }, admin);
    expect(prisma.activityEvent.create.mock.calls[0][0].data).toMatchObject({
      type: 'USER_DEACTIVATED',
      summary: 'Usuario desactivado: Nombre',
    });

    prisma.activityEvent.create.mockClear();
    await service.update('u2', { email: 'old@x.ec', role: Role.ABOGADO }, admin);
    expect(prisma.activityEvent.create).not.toHaveBeenCalled();
  });
});
