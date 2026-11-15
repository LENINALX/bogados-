import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService.registerClient: no se puede quitar el caso a su cliente', () => {
  const lawyer = { id: 'abo1', role: Role.ABOGADO, tenantId: 't1', email: 'a@b.ec', name: 'Nombre' };

  function setup(caseRow: Record<string, unknown> | null, updated = 1) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(async ({ data }) => ({ id: 'cli9', ...data })),
      },
      activityEvent: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      case: { findFirst: jest.fn().mockResolvedValue(caseRow), updateMany: jest.fn().mockResolvedValue({ count: updated }) },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const tokens = { send: jest.fn().mockResolvedValue(true) };
    const service = new AuthService(prisma as never, {} as never, tokens as never, {} as never, {} as never, {} as never);
    return { prisma, service };
  }
  const dto = { email: 'nuevo@correo.ec', name: 'Nombre', caseId: 'case1' };

  it('un caso que ya tiene cliente no se puede reasignar desde aquí (antes el cliente real perdía el acceso)', async () => {
    const { prisma, service } = setup({ id: 'case1', lawyerId: 'abo1', clientId: 'cli1' });
    await expect(service.registerClient(dto, lawyer)).rejects.toThrow(/ya tiene cliente/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('caso sin cliente: se vincula de forma condicional y queda en la actividad', async () => {
    const { prisma, service } = setup({ id: 'case1', lawyerId: 'abo1', clientId: null });
    await service.registerClient(dto, lawyer);
    expect(prisma.case.updateMany).toHaveBeenCalledWith({
      where: { id: 'case1', tenantId: 't1', clientId: null },
      data: { clientId: 'cli9' },
    });
    expect(prisma.activityEvent.create.mock.calls[0][0].data).toMatchObject({ type: 'USER_CREATED', actorId: 'abo1' });
  });

  it('si otro le puso cliente entre medias, falla y no deja la cuenta creada', async () => {
    const { service } = setup({ id: 'case1', lawyerId: 'abo1', clientId: null }, 0);
    await expect(service.registerClient(dto, lawyer)).rejects.toBeInstanceOf(BadRequestException);
  });
});
