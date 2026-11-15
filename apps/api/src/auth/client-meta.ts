import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { isIP } from 'net';

/** Desde dónde se intenta entrar: se guarda en el registro de accesos y va en el email del código. */
export type ClientMeta = { ip?: string | null; userAgent?: string | null };

const USER_AGENT_MAX = 300;

function header(req: { headers?: Record<string, unknown> }, name: string): string | undefined {
  const value = req.headers?.[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.trim() ? first.trim() : undefined;
}

type Env = { CLIENT_FORWARD_SECRET?: string; NODE_ENV?: string };

/**
 * ¿Viene la petición del servidor de Next? Lo demuestra con CLIENT_FORWARD_SECRET. Sin el
 * secreto configurado no se confía nunca (tampoco en desarrollo): si no, quien llame a la API
 * directamente podría inventar una IP en cada intento y saltarse el bloqueo por IP.
 */
export function trustsForwardedHeaders(req: { headers?: Record<string, unknown> }, env: Env = process.env): boolean {
  const secret = env.CLIENT_FORWARD_SECRET;
  if (!secret) return false;
  const got = header(req, 'x-client-forward-secret');
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * El login de la web llega desde el servidor de Next (NextAuth), que reenvía la IP y el
 * navegador reales en x-client-ip y x-client-user-agent. Solo se creen si quien los envía
 * demuestra ser ese servidor; si no, cualquiera podría anotar en el registro la IP que quisiera.
 * Son datos informativos para el registro de accesos: nunca se usan para autorizar nada.
 */
export function readClientMeta(
  req: { headers?: Record<string, unknown>; ip?: string },
  env: Env = process.env,
): ClientMeta {
  const trusted = trustsForwardedHeaders(req, env);
  // Solo una IP de verdad: un texto cualquiera acabaría en el registro de accesos y en los emails
  const forwarded = trusted ? asIp(header(req, 'x-client-ip')) : null;
  const userAgent = (trusted ? header(req, 'x-client-user-agent') : undefined) ?? header(req, 'user-agent');
  return {
    ip: forwarded ?? asIp(req.ip),
    userAgent: userAgent?.slice(0, USER_AGENT_MAX) ?? null,
  };
}

/** «::ffff:1.2.3.4» → «1.2.3.4»; lo que no sea una IPv4/IPv6 válida → null. */
export function asIp(value: string | undefined | null): string | null {
  const v = value?.trim().replace(/^::ffff:/, '');
  return v && isIP(v) ? v : null;
}

export const Client = createParamDecorator((_: unknown, ctx: ExecutionContext): ClientMeta =>
  readClientMeta(ctx.switchToHttp().getRequest()),
);

/** «Chrome en Windows», «Safari en iPhone»… Suficiente para reconocer un acceso, sin librerías. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Navegador desconocido';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /curl|node|undici|axios|python/i.test(ua)
              ? 'Cliente de API'
              : 'Navegador';
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : null;
  return os ? `${browser} en ${os}` : browser;
}
