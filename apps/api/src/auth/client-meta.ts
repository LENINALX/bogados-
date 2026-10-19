import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Desde dónde se intenta entrar: se guarda en el registro de accesos y va en el email del código. */
export type ClientMeta = { ip?: string | null; userAgent?: string | null };

const USER_AGENT_MAX = 300;

function header(req: { headers?: Record<string, unknown> }, name: string): string | undefined {
  const value = req.headers?.[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.trim() ? first.trim() : undefined;
}

/**
 * El login de la web llega desde el servidor de Next (NextAuth), que reenvía la IP y el
 * navegador reales en x-client-ip y x-client-user-agent. Son datos informativos para el
 * registro de accesos: nunca se usan para autorizar nada.
 */
export function readClientMeta(req: { headers?: Record<string, unknown>; ip?: string }): ClientMeta {
  const forwarded = header(req, 'x-client-ip') ?? header(req, 'x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = header(req, 'x-client-user-agent') ?? header(req, 'user-agent');
  return {
    ip: (forwarded ?? req.ip ?? null)?.replace(/^::ffff:/, '').slice(0, 64) ?? null,
    userAgent: userAgent?.slice(0, USER_AGENT_MAX) ?? null,
  };
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
