import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Freno contra avalanchas de peticiones por cuenta (firma + email) o por desafío en la ventana
 * `ttl`. Cuenta todas las peticiones, también las correctas; el bloqueo por contraseñas
 * fallidas, que es el que ve la persona, está en AuthService (ACCOUNT_LOCKOUT).
 */
export const LOGIN_THROTTLE = { ttl: 15 * 60_000, limit: 20 };

export const LOGIN_THROTTLE_MESSAGE =
  'Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.';

export const loginThrottlerOptions: ThrottlerModuleOptions = {
  throttlers: [{ name: 'login', ...LOGIN_THROTTLE }],
  errorMessage: LOGIN_THROTTLE_MESSAGE,
};

/**
 * Limita por cuenta y no por IP: los logins de la web llegan desde el servidor
 * de Next (NextAuth), así que limitar por IP bloquearía a toda la firma a la vez.
 * Sin email en el body (petición malformada) se usa la IP.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = (req.body ?? {}) as { email?: unknown; tenantSlug?: unknown; challengeId?: unknown };
    const normalize = (v: unknown) => (typeof v === 'string' ? v.toLowerCase().trim() : '');
    // Segundo paso (código por email): se cuenta por desafío, que identifica a la cuenta
    const challengeId = normalize(body.challengeId);
    if (challengeId) return `login-challenge:${challengeId}`;
    const email = normalize(body.email);
    if (!email) return super.getTracker(req);
    return `login:${normalize(body.tenantSlug)}:${email}`;
  }
}
