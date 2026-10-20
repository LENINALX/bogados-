import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountTokensService } from './account-tokens.service';
import { LoginEventsService } from './login-events.service';
import { FirmSignupService } from './firm-signup.service';
import { LOGIN_THROTTLE, LOGIN_THROTTLE_MESSAGE, loginThrottlerOptions } from './login-throttle';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

describe('Límite de intentos en POST /auth/login', () => {
  let app: INestApplication;
  let baseUrl: string;
  const login = jest.fn().mockResolvedValue({ accessToken: 't' });
  const verifyLogin = jest.fn().mockResolvedValue({ accessToken: 't' });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(loginThrottlerOptions)],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login, verifyLogin } },
        { provide: AccountTokensService, useValue: {} },
        { provide: LoginEventsService, useValue: {} },
        { provide: FirmSignupService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
    login.mockClear();
    verifyLogin.mockClear();
  });

  const attempt = (body: Record<string, string>, path = 'login') =>
    fetch(`${baseUrl}/auth/${path}`, {
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

  it('el paso del código se limita por desafío, no por IP (todas las verificaciones llegan desde Next)', async () => {
    const verify = (challengeId: string) => attempt({ challengeId, code: '000000' }, 'login/verify');
    for (let i = 0; i < LOGIN_THROTTLE.limit; i++) expect((await verify('ch-1')).status).toBe(200);
    expect((await verify('ch-1')).status).toBe(429);
    // Otro usuario verificando desde el mismo servidor no queda bloqueado
    expect((await verify('ch-2')).status).toBe(200);
  });
});
