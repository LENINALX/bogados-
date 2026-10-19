/**
 * Resultado de un intento de acceso que no termina en sesión. NextAuth solo deja pasar
 * un texto (`res.error`) desde `authorize()` a la página, así que se codifica aquí.
 * Módulo aparte para que la página de login (cliente) no importe lib/auth.ts (Prisma).
 */
export const API_UNAVAILABLE = "API_UNAVAILABLE";
export const TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS";

export type LoginChallenge = {
  challengeId: string;
  emailHint: string;
  expiresAt: string;
  resendAvailableAt: string;
};

export type LoginOutcome =
  /** Credenciales incorrectas; `remaining`: intentos antes del bloqueo temporal */
  | { kind: "invalid"; remaining?: number }
  | { kind: "locked"; retryAfterSeconds?: number }
  | { kind: "unavailable" }
  /** Contraseña correcta: falta el código que se envió por email */
  | { kind: "two_factor"; challenge: LoginChallenge }
  | { kind: "bad_code"; message: string; remaining?: number }
  | { kind: "code_expired"; message: string }
  /** El desafío ya no sirve (usado, agotado o inexistente): volver al primer paso */
  | { kind: "restart"; message: string };

const PREFIX = "BGD:";

export function encodeLoginOutcome(outcome: LoginOutcome): string {
  return PREFIX + encodeURIComponent(JSON.stringify(outcome));
}

/** Acepta también los códigos de NextAuth y los antiguos, por si llega uno. */
export function decodeLoginOutcome(error: string | null | undefined): LoginOutcome {
  if (error?.startsWith(PREFIX)) {
    try {
      return JSON.parse(decodeURIComponent(error.slice(PREFIX.length))) as LoginOutcome;
    } catch {
      return { kind: "unavailable" };
    }
  }
  if (error === "CredentialsSignin") return { kind: "invalid" };
  if (error === TOO_MANY_ATTEMPTS) return { kind: "locked" };
  return { kind: "unavailable" };
}

/** Avisar de los intentos restantes solo cuando ya quedan pocos (la API bloquea tras 5 fallos). */
export const WARN_REMAINING_AT = 3;

function minutes(seconds: number) {
  const m = Math.max(1, Math.ceil(seconds / 60));
  return m === 1 ? "1 minuto" : `${m} minutos`;
}

/** Texto para la persona, sin revelar si el email existe o qué dato falló. */
export function loginOutcomeMessage(outcome: LoginOutcome): string {
  switch (outcome.kind) {
    case "invalid": {
      const base = "El código de firma, el email o la contraseña no son correctos.";
      const r = outcome.remaining;
      if (r === undefined || r > WARN_REMAINING_AT) return `${base} Revísalos e inténtalo de nuevo.`;
      if (r === 0) return `${base} Por seguridad, la cuenta queda bloqueada 15 minutos.`;
      return `${base} ${r === 1 ? "Te queda 1 intento" : `Te quedan ${r} intentos`} antes de un bloqueo temporal de 15 minutos.`;
    }
    case "locked":
      return outcome.retryAfterSeconds
        ? `Demasiados intentos con esta cuenta. Por seguridad, espera ${minutes(outcome.retryAfterSeconds)} e inténtalo de nuevo.`
        : "Demasiados intentos con esta cuenta. Espera 15 minutos e inténtalo de nuevo.";
    case "unavailable":
      return "No pudimos conectar con el servidor. Comprueba tu conexión o inténtalo en unos minutos.";
    case "two_factor":
      return "";
    case "bad_code":
    case "code_expired":
    case "restart":
      return outcome.message;
  }
}
