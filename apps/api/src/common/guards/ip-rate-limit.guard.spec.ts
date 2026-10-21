import { ExecutionContext, HttpException } from '@nestjs/common';
import { IpRateLimit } from './ip-rate-limit.guard';

function ctx(ip: string, setHeader = jest.fn()) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ ip }), getResponse: () => ({ setHeader }) }),
  } as unknown as ExecutionContext;
}

describe('IpRateLimit', () => {
  afterEach(() => jest.useRealTimers());

  it('deja pasar hasta el límite y luego responde 429 con Retry-After', () => {
    const guard = new (IpRateLimit(3, 60_000))();
    for (let i = 0; i < 3; i++) expect(guard.canActivate(ctx('1.1.1.1'))).toBe(true);
    const setHeader = jest.fn();
    const err = (() => {
      try {
        guard.canActivate(ctx('1.1.1.1', setHeader));
      } catch (e) {
        return e as HttpException;
      }
    })();
    expect(err?.getStatus()).toBe(429);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('cada IP tiene su propio contador', () => {
    const guard = new (IpRateLimit(1, 60_000))();
    expect(guard.canActivate(ctx('1.1.1.1'))).toBe(true);
    expect(guard.canActivate(ctx('2.2.2.2'))).toBe(true);
    expect(() => guard.canActivate(ctx('1.1.1.1'))).toThrow(HttpException);
  });

  it('al pasar la ventana se vuelve a permitir', () => {
    jest.useFakeTimers();
    const guard = new (IpRateLimit(1, 1_000))();
    expect(guard.canActivate(ctx('1.1.1.1'))).toBe(true);
    expect(() => guard.canActivate(ctx('1.1.1.1'))).toThrow(HttpException);
    jest.advanceTimersByTime(1_001);
    expect(guard.canActivate(ctx('1.1.1.1'))).toBe(true);
  });
});
