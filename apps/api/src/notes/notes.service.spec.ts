import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { NotesService } from './notes.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

describe('NotesService.create (aviso al cliente)', () => {
  let prisma: {
    case: { findFirst: jest.Mock };
    caseNote: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let activity: { log: jest.Mock };
  let notifications: { create: jest.Mock };
  let clientUpdates: { email: jest.Mock };
  let service: NotesService;

  const lawyer: JwtPayloadUser = {
    id: 'law1',
    email: 'abogado@demo.bogados',
    role: Role.ABOGADO,
    tenantId: 't1',
    name: 'Lawyer',
  };

  beforeEach(() => {
    prisma = {
      case: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'c1', tenantId: 't1', title: 'Desalojo', lawyerId: 'law1', clientId: 'cli1' }),
      },
      caseNote: {
        create: jest.fn(async ({ data }) => ({ id: 'n1', ...data, author: { id: 'law1', name: 'Lawyer' } })),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    activity = { log: jest.fn() };
    notifications = { create: jest.fn() };
    clientUpdates = { email: jest.fn().mockResolvedValue(true) };
    service = new NotesService(
      prisma as never,
      activity as never,
      notifications as never,
      clientUpdates as never,
    );
  });

  it('nota interna (por defecto): ni notificación ni email al cliente', async () => {
    await service.create('c1', { body: 'Revisar escrito' }, lawyer);
    expect(prisma.caseNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isInternal: true }) }),
    );
    expect(notifications.create).not.toHaveBeenCalled();
    expect(clientUpdates.email).not.toHaveBeenCalled();
  });

  it('nota visible: notifica al cliente en la app y le envía el email', async () => {
    await service.create('c1', { body: 'Se fijó la audiencia para el 20 de octubre.', isInternal: false }, lawyer);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'cli1',
        body: '"Desalojo": Se fijó la audiencia para el 20 de octubre.',
        meta: expect.objectContaining({ type: 'CASE_UPDATE', caseId: 'c1' }),
      }),
      prisma,
    );
    expect(activity.log.mock.calls[0][0].meta).toMatchObject({ isInternal: false, emailedClient: true });
    expect(clientUpdates.email).toHaveBeenCalledWith('c1', {
      kind: 'note',
      body: 'Se fijó la audiencia para el 20 de octubre.',
    });
  });

  it('nota visible con notifyClient: false: notificación en la app, sin email', async () => {
    await service.create('c1', { body: 'Avance', isInternal: false, notifyClient: false }, lawyer);
    expect(notifications.create).toHaveBeenCalled();
    expect(clientUpdates.email).not.toHaveBeenCalled();
    expect(activity.log.mock.calls[0][0].meta).not.toHaveProperty('emailedClient');
  });

  it('caso sin cliente: no hay a quién avisar', async () => {
    prisma.case.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1', title: 'X', lawyerId: 'law1', clientId: null });
    await service.create('c1', { body: 'Avance', isInternal: false }, lawyer);
    expect(notifications.create).not.toHaveBeenCalled();
    expect(clientUpdates.email).not.toHaveBeenCalled();
  });

  it('si la transacción falla no se envía el email', async () => {
    activity.log.mockRejectedValueOnce(new Error('db caída'));
    await expect(service.create('c1', { body: 'Avance', isInternal: false }, lawyer)).rejects.toThrow('db caída');
    expect(clientUpdates.email).not.toHaveBeenCalled();
  });

  it('un cliente no puede crear notas', async () => {
    await expect(
      service.create('c1', { body: 'Hola' }, { ...lawyer, id: 'cli1', role: Role.CLIENTE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
