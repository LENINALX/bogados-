import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, mixin, Type } from '@nestjs/common';

type Bucket = { count: number; resetAt: number };

/**
 * Límite sencillo por IP para endpoints públicos de consulta (sin sesión ni email con el que
 * contar). Evita recorrer códigos en masa para descubrir qué firmas existen. En memoria: con
 * varias instancias de la API, el límite efectivo se multiplica por el número de instancias.
 */
export function IpRateLimit(limit: number, windowMs: number): Type<CanActivate> {
  @Injectable()
  class IpRateLimitGuard implements CanActivate {
    private readonly buckets = new Map<string, Bucket>();
    private lastSweep = 0;

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<{ ip?: string; socket?: { remoteAddress?: string } }>();
      const res = context.switchToHttp().getResponse<{ setHeader?: (k: string, v: string) => void }>();
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'desconocida';
      const now = Date.now();
      this.sweep(now);

      let bucket = this.buckets.get(ip);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        this.buckets.set(ip, bucket);
      }
      bucket.count += 1;
      if (bucket.count > limit) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        res.setHeader?.('Retry-After', String(retryAfter));
        throw new HttpException(
          { message: 'Demasiadas consultas seguidas. Espera un momento e inténtalo de nuevo.', error: { retryAfterSeconds: retryAfter } },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    }

    /** Olvida las IP cuya ventana ya pasó (como mucho, una vez por ventana). */
    private sweep(now: number) {
      if (now - this.lastSweep < windowMs) return;
      this.lastSweep = now;
      for (const [ip, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(ip);
    }
  }
  return mixin(IpRateLimitGuard);
}
