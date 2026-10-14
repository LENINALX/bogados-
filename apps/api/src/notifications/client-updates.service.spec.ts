import { buildClientUpdateEmail } from './client-update-emails';
import { ClientUpdatesService } from './client-updates.service';

describe('buildClientUpdateEmail', () => {
  const base = {
    recipientName: 'Ana',
    tenantName: 'Estudio Demo',
    caseTitle: 'Desalojo <urgente>',
    lawyerName: 'Dra. Pérez',
    link: 'http://localhost:3000/portal/casos/c1',
  };

  it('cambio de estado: asunto con el nuevo estado y explicación en palabras de cliente', () => {
    const email = buildClientUpdateEmail({
      ...base,
      update: { kind: 'status', from: 'abierto', to: 'en_pausa', message: 'Esperamos la audiencia.' },
    });
    expect(email.subject).toBe('Tu caso «Desalojo <urgente>» ahora está: En pausa · Estudio Demo');
    expect(email.text).toContain('Tu caso está detenido por ahora.');
    expect(email.text).toContain('Estado: Abierto → En pausa');
    expect(email.text).toContain('Mensaje de tu abogado:\nEsperamos la audiencia.');
    expect(email.text).toContain(base.link);
  });

  it('sin mensaje no aparece el bloque del mensaje', () => {
    const email = buildClientUpdateEmail({ ...base, update: { kind: 'status', from: 'intake', to: 'abierto' } });
    expect(email.text).not.toContain('Mensaje de tu abogado');
    expect(email.html).not.toContain('Mensaje de tu abogado');
  });

  it('nota: incluye la novedad y escapa el HTML', () => {
    const email = buildClientUpdateEmail({
      ...base,
      update: { kind: 'note', body: 'Audiencia <b>el 20</b>' },
    });
    expect(email.subject).toBe('Novedad en tu caso «Desalojo <urgente>» · Estudio Demo');
    expect(email.html).toContain('Audiencia &#60;b&#62;el 20&#60;/b&#62;');
    expect(email.html).toContain('Desalojo &#60;urgente&#62;');
    expect(email.html).not.toContain('<b>el 20</b>');
  });
});

describe('ClientUpdatesService.email', () => {
  const config = { get: (_k: string, d: string) => d };
  const found = {
    title: 'Desalojo',
    tenant: { name: 'Estudio Demo' },
    lawyer: { name: 'Dra. Pérez' },
    client: { name: 'Ana', email: 'ana@example.com', active: true },
  };

  function make(caseRow: unknown, send = jest.fn()) {
    const prisma = { case: { findUnique: jest.fn().mockResolvedValue(caseRow) } };
    return { service: new ClientUpdatesService(prisma as never, { send } as never, config as never), send };
  }

  it('envía al email del cliente con el enlace a su portal', async () => {
    const { service, send } = make(found);
    await expect(service.email('c1', { kind: 'note', body: 'Avance' })).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        text: expect.stringContaining('http://localhost:3000/portal/casos/c1'),
      }),
    );
  });

  it('cliente desactivado o caso sin cliente: no envía', async () => {
    const inactive = make({ ...found, client: { ...found.client, active: false } });
    await expect(inactive.service.email('c1', { kind: 'note', body: 'x' })).resolves.toBe(false);
    expect(inactive.send).not.toHaveBeenCalled();

    const noClient = make({ ...found, client: null });
    await expect(noClient.service.email('c1', { kind: 'note', body: 'x' })).resolves.toBe(false);
  });

  it('un fallo del servidor de correo no se propaga', async () => {
    const { service } = make(found, jest.fn().mockRejectedValue(new Error('SMTP caído')));
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    await expect(service.email('c1', { kind: 'note', body: 'x' })).resolves.toBe(false);
  });
});
