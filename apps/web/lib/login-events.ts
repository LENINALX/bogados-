/** Intento de acceso tal como lo devuelve la API (GET /auth/security y /auth/login-events). */
export type LoginEvent = {
  id: string;
  email: string;
  success: boolean;
  reason: string;
  ip: string | null;
  userAgent: string | null;
  /** «Chrome en Windows»: ya descrito por la API */
  device: string;
  createdAt: string;
  user: { id: string; name: string; role: string } | null;
};

/** Cómo entró (éxito) o por qué no pudo (fallo), en palabras de la persona. */
export const LOGIN_REASON_LABELS: Record<string, string> = {
  password: "Contraseña",
  two_factor: "Contraseña y código",
  bad_password: "Contraseña incorrecta",
  unknown_user: "Email no registrado",
  inactive: "Cuenta desactivada",
  bad_code: "Código incorrecto",
  expired_code: "Código caducado",
};

export function loginReasonLabel(reason: string): string {
  return LOGIN_REASON_LABELS[reason] ?? reason;
}

/** «19 oct 2026, 10:42» en la zona horaria indicada (la del bufete). */
export function formatLoginDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(iso))
    .replace(/\./g, "");
}
