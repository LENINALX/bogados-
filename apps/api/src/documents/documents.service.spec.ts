import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

const user = (id: string, role: Role): JwtPayloadUser => ({
  id,
  role,
  email: `${id}@demo.bogados`,
  tenantId: 't1',
  name: id,
});

const admin = user('admin1', Role.ADMIN);
const lawyer = user('law1', Role.ABOGADO);
const client = user('cli1', Role.CLIENTE);

const file = {
  originalname: 'contrato.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('x'),
} as Express.Multer.File;

describe('DocumentsService.upload', () => {
  let tx: { document: { create: jest.Mock } };
  let prisma: { case: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let storage: { save: jest.Mock; remove: jest.Mock };
  let activity: { log: jest.Mock };
  let notifications: { create: jest.Mock };
  let service: DocumentsService;

  beforeEach(() => {
    tx = {
      document: {
        create: jest.fn(async ({ data }) => ({ id: 'd1', fileName: data.fileName })),
      },
    };
    prisma = {
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'c1',
          tenantId: 't1',
          title: 'Caso',
          lawyerId: 'law1',
          clientId: 'cli1',
        }),
      },
      $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    };
    storage = {
      save: jest.fn().mockResolvedValue({ storagePath: 't1/c1/contrato.pdf' }),
      remove: jest.fn(),
    };
    activity = { log: jest.fn() };
    notifications = { create: jest.fn() };
    service = new DocumentsService(
      prisma as never,
      storage as never,
      activity as never,
      notifications as never,
    );
  });

  const notifiedUser = () => notifications.create.mock.calls[0]?.[0]?.userId;

  it('el cliente sube → se notifica al abogado', async () => {
    await service.upload('c1', file, undefined, client);
    expect(notifiedUser()).toBe('law1');
    expect(tx.document.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sharedWithClient: true }) }),
    );
  });

  it('staff comparte con el cliente → se notifica al cliente', async () => {
    await service.upload('c1', file, 'true', admin);
    expect(notifiedUser()).toBe('cli1');
    expect(notifications.create.mock.calls[0][0].meta.type).toBe('DOC_SHARED');
  });

  it('admin sube un documento interno → se notifica al abogado', async () => {
    await service.upload('c1', file, 'false', admin);
    expect(notifiedUser()).toBe('law1');
  });

  it('el abogado sube un documento interno → nadie (no se notifica a sí mismo)', async () => {
    await service.upload('c1', file, 'false', lawyer);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('actividad y notificación usan la transacción', async () => {
    await service.upload('c1', file, 'true', admin);
    expect(activity.log).toHaveBeenCalledWith(expect.anything(), tx);
    expect(notifications.create).toHaveBeenCalledWith(expect.anything(), tx);
  });

  it('si la transacción falla, borra el archivo guardado y propaga el error', async () => {
    activity.log.mockRejectedValueOnce(new Error('db caída'));
    await expect(service.upload('c1', file, 'true', admin)).rejects.toThrow('db caída');
    expect(storage.remove).toHaveBeenCalledWith('t1/c1/contrato.pdf');
  });

  it('si todo va bien, no borra el archivo', async () => {
    await service.upload('c1', file, 'true', admin);
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
