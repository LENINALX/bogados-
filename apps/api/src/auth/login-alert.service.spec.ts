import { buildNewLoginEmail, LOGIN_ALERT, LoginAlertService } from './login-alert.service';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';
const CHROME_WIN_NEWER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

describe('buildNewLoginEmail', () => {
  it('dice desde dónde y cuándo (hora de la firma) y qué hacer si no fue uno', () => {
    const e = buildNewLoginEmail({
      name: 'Nombre',
      tenantName: 'Firma <Demo>',
      device: 'Safari en iPhone',
      ip: '190.1.2.3',
      at: new Date('2026-11-11T19:40:00Z'),
      timeZone: 'America/Guayaquil',
      securityUrl: 'https://app.bogados.ec/cuenta/seguridad',
    });
    expect(e.subject).toBe('Nuevo inicio de sesión en Firma <Demo>');
    expect(e.text).toContain('Safari en iPhone · IP 190.1.2.3');
    expect(e.text).toContain('11 de noviembre de 2026, 2:40'); // UTC-5
    expect(e.text).toContain('cambia tu contraseña');
    expect(e.text).toContain('https://app.bogados.ec/cuenta/seguridad');
    expect(e.html).toContain('Firma &#60;Demo&#62;');
  });
});

describe('LoginAlertService', () => {
  let prisma: { loginEvent: { findMany: jest.Mock } };
  let mail: { send: jest.Mock };
  let service: LoginAlertService;
  const config = { get: (_k: string, d: unknown) => d };

  beforeEach(() => {
    prisma = { loginEvent: { findMany: jest.fn() } };
    mail = { send: jest.fn() };
    service = new LoginAlertService(prisma as never, mail as never, config as never);
  });

  it('mira solo accesos correctos del usuario en el periodo', async () => {
    prisma.loginEvent.findMany.mockResolvedValue([]);
    await service.isNewDevice('u1', CHROME_WIN);
    const args = prisma.loginEvent.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ userId: 'u1', success: true });
    expect(Date.now() - args.where.createdAt.gte.getTime()).toBeGreaterThanOrEqual(LOGIN_ALERT.lookbackMs - 1000);
    expect(args.distinct).toEqual(['userAgent']);
  });

  it('primer acceso de la cuenta: no avisa (no hay con qué comparar)', async () => {
    prisma.loginEvent.findMany.mockResolvedValue([]);
    await expect(service.isNewDevice('u1', CHROME_WIN)).resolves.toBe(false);
  });

  it('el mismo navegador actualizado no cuenta como nuevo', async () => {
    prisma.loginEvent.findMany.mockResolvedValue([{ userAgent: CHROME_WIN }]);
    await expect(service.isNewDevice('u1', CHROME_WIN_NEWER)).resolves.toBe(false);
  });

  it('otro navegador o dispositivo sí es nuevo', async () => {
    prisma.loginEvent.findMany.mockResolvedValue([{ userAgent: CHROME_WIN }]);
    await expect(service.isNewDevice('u1', SAFARI_IPHONE)).resolves.toBe(true);
    await expect(service.isNewDevice('u1', null)).resolves.toBe(true);
  });

  it('send: envía al email de la cuenta con el enlace a la seguridad', async () => {
    await service.send(
      { email: 'abogado@demo.bogados', name: 'Nombre' },
      { id: 't1', name: 'Firma Demo', timezone: 'America/Guayaquil' },
      { ip: '190.1.2.3', userAgent: SAFARI_IPHONE },
      new Date(),
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'abogado@demo.bogados', subject: 'Nuevo inicio de sesión en Firma Demo' }),
    );
    expect(mail.send.mock.calls[0][0].text).toContain('http://localhost:3000/cuenta/seguridad');
  });

  it('send: si el correo falla no lanza (no debe impedir entrar)', async () => {
    mail.send.mockRejectedValue(new Error('SMTP caído'));
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    await expect(
      service.send({ email: 'a@b.co', name: 'Nombre' }, { id: 't1', name: 'F', timezone: 'America/Guayaquil' }, {}, new Date()),
    ).resolves.toBeUndefined();
  });
});
