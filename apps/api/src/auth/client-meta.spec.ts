import { describeUserAgent, readClientMeta } from './client-meta';

describe('readClientMeta', () => {
  it('usa la IP y el navegador que reenvía la web (el login llega desde el servidor de Next)', () => {
    const meta = readClientMeta({
      ip: '::ffff:127.0.0.1',
      headers: { 'x-client-ip': '190.1.2.3', 'x-client-user-agent': 'Firefox/130', 'user-agent': 'node' },
    });
    expect(meta).toEqual({ ip: '190.1.2.3', userAgent: 'Firefox/130' });
  });

  it('sin cabeceras de la web: primera IP de x-forwarded-for o la de la conexión', () => {
    expect(readClientMeta({ headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } }).ip).toBe('10.0.0.1');
    expect(readClientMeta({ ip: '::ffff:192.168.1.5', headers: {} }).ip).toBe('192.168.1.5');
  });

  describe('en producción solo se cree al servidor de Next', () => {
    const forged = {
      ip: '::ffff:203.0.113.7',
      headers: { 'x-client-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8', 'x-client-user-agent': 'Falso/1', 'user-agent': 'curl/8' },
    };

    it('sin secreto configurado: ignora las cabeceras reenviadas y usa la conexión', () => {
      expect(readClientMeta(forged, { NODE_ENV: 'production' })).toEqual({ ip: '203.0.113.7', userAgent: 'curl/8' });
    });

    it('con secreto: solo si la petición trae el mismo', () => {
      const env = { NODE_ENV: 'production', CLIENT_FORWARD_SECRET: 's3cr3t-compartido' };
      expect(readClientMeta({ ...forged, headers: { ...forged.headers, 'x-client-forward-secret': 'otro' } }, env).ip).toBe('203.0.113.7');
      expect(readClientMeta({ ...forged, headers: { ...forged.headers, 'x-client-forward-secret': 's3cr3t-compartido' } }, env)).toEqual({
        ip: '1.2.3.4',
        userAgent: 'Falso/1',
      });
    });
  });

  it('recorta un user-agent desmesurado', () => {
    expect(readClientMeta({ headers: { 'user-agent': 'x'.repeat(1000) } }).userAgent).toHaveLength(300);
  });
});

describe('describeUserAgent', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', 'Chrome en Windows'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0', 'Edge en Windows'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', 'Safari en iPhone'],
    ['Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', 'Chrome en Android'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox en Mac'],
    ['curl/8.4.0', 'Cliente de API'],
    [null, 'Navegador desconocido'],
  ])('%s → %s', (ua, expected) => {
    expect(describeUserAgent(ua)).toBe(expected);
  });
});
