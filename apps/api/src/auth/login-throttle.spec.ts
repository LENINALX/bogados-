import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LOGIN_THROTTLE, LOGIN_THROTTLE_MESSAGE, loginThrottlerOptions } from './login-throttle';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

describe('Límite de intentos en POST /auth/login', () => {
  let app: INestApplication;
  let baseUrl: string;
  const login = jest.fn().mockResolvedValue({ accessToken: 't' });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(loginThrottlerOptions)],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
    login.mockClear();
  });

  const attempt = (body: Record<string, string>) =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const account = { email: 'admin@demo.bogados', password: 'x', tenantSlug: 'firma-demo' };

  it(`bloquea la cuenta tras ${LOGIN_THROTTLE.limit} intentos con 429 y mensaje en español`, async () => {
    for (let i = 0; i < LOGIN_THROTTLE.limit; i++) {
      expect((await attempt(account)).status).toBe(201);
    }
    const blocked = await attempt(account);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe(LOGIN_THROTTLE_MESSAGE);
    expect(login).toHaveBeenCalledTimes(LOGIN_THROTTLE.limit);
  });

  it('el mismo email con otro formato cuenta como la misma cuenta', async () => {
    for (let i = 0; i < LOGIN_THROTTLE.limit; i++) await attempt(account);
    const res = await attempt({ ...account, email: ' Admin@Demo.Bogados', tenantSlug: 'FIRMA-DEMO' });
    expect(res.status).toBe(429);
  });

  it('el bloqueo de una cuenta no afecta a otras (misma IP)', async () => {
    for (let i = 0; i < LOGIN_THROTTLE.limit; i++) await attempt(account);
    expect((await attempt(account)).status).toBe(429);
    expect((await attempt({ ...account, email: 'abogado@demo.bogados' })).status).toBe(201);
    expect((await attempt({ ...account, tenantSlug: 'otra-firma' })).status).toBe(201);
  });
});
