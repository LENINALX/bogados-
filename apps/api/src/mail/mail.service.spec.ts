import { BOGADOS_BRAND, brandEmail, FirmBranding, MailService } from './mail.service';

const firm = (over: Partial<FirmBranding> = {}): FirmBranding => ({
  name: 'Firma <Demo>',
  slug: 'firma-demo',
  brandColor: null,
  contactEmail: null,
  contactPhone: null,
  address: null,
  website: null,
  logoVersion: null,
  ...over,
});
const msg = { text: 'Hola', html: `<a style="background:${BOGADOS_BRAND}">Entrar</a><p style="color:${BOGADOS_BRAND}">x</p>` };

describe('brandEmail', () => {
  it('sin identidad configurada, el email no cambia', () => {
    expect(brandEmail(msg, firm(), 'https://app.test')).toEqual(msg);
  });

  it('usa el color de la firma en lugar del de Bogados, en todas partes', () => {
    const out = brandEmail(msg, firm({ brandColor: '#7a1f2b' }), 'https://app.test');
    expect(out.html).not.toContain(BOGADOS_BRAND);
    expect(out.html.match(/#7a1f2b/g)).toHaveLength(2);
  });

  it('pone el logo arriba con su versión y el contacto abajo, escapado', () => {
    const out = brandEmail(
      msg,
      firm({ logoVersion: 123, contactEmail: 'despacho@firma.ec', contactPhone: '+593 2 123 4567', address: 'Av. <Amazonas>' }),
      'https://app.test',
    );
    expect(out.html.startsWith('<p style="margin:0 0 16px"><img src="https://app.test/api/firmas/firma-demo/logo?v=123"')).toBe(true);
    expect(out.html).toContain('alt="Firma &#60;Demo&#62;"');
    expect(out.html).toContain('Av. &#60;Amazonas&#62;');
    expect(out.text).toBe('Hola\n\n—\nFirma <Demo>\ndespacho@firma.ec\n+593 2 123 4567\nAv. <Amazonas>');
  });
});

describe('MailService.send con firma', () => {
  const config = { get: (k: string, d: unknown) => (k === 'appUrl' ? 'https://app.test' : d) };

  it('sin SMTP en desarrollo: escribe en el log el texto ya con la identidad de la firma', async () => {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          ...firm({ contactEmail: 'despacho@firma.ec' }),
          logoPath: null,
          logoUpdatedAt: null,
        }),
      },
    };
    const service = new MailService(config as never, prisma as never);
    const log = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    await service.send({ to: 'a@b.ec', subject: 'S', text: 'Hola', html: '<p>Hola</p>', tenantId: 't1' });
    expect(prisma.tenant.findUnique.mock.calls[0][0].where).toEqual({ id: 't1' });
    expect(log.mock.calls[0][0]).toContain('despacho@firma.ec');
  });

  it('si no puede leer la firma, el email sale igual', async () => {
    const prisma = { tenant: { findUnique: jest.fn().mockRejectedValue(new Error('BD caída')) } };
    const service = new MailService(config as never, prisma as never);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    await service.send({ to: 'a@b.ec', subject: 'S', text: 'Hola', html: '<p>Hola</p>', tenantId: 't1' });
    expect(log).toHaveBeenCalled();
  });
});
