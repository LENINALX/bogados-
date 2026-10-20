import * as path from 'path';
import { StorageService } from './storage.service';

describe('StorageService.resolvePath', () => {
  const root = path.resolve('/tmp/bogados-uploads');
  const service = new StorageService({ get: () => root } as never);

  it('resuelve rutas dentro de la carpeta de subidas', () => {
    expect(service.resolvePath('t1/c1/archivo.pdf')).toBe(path.join(root, 't1', 'c1', 'archivo.pdf'));
  });

  it.each(['../secreto.txt', 't1/../../etc/passwd', path.resolve('/etc/passwd'), ''])(
    'nunca sale de la carpeta (%s)',
    (p) => {
      expect(() => service.resolvePath(p)).toThrow();
    },
  );

  it('remove no lanza aunque la ruta sea mala', async () => {
    await expect(service.remove('../../fuera')).resolves.toBeUndefined();
  });
});
