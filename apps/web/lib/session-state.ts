/**
 * Decide si una sesión web sigue siendo válida. Se evalúa en cada lectura de la
 * sesión (callback `jwt` de NextAuth) con los datos actuales del usuario en BD.
 *
 * - "revoked": el usuario no existe o está desactivado.
 * - "expired": el JWT de la API falta o caducó, o la contraseña cambió después
 *   de emitirlo (misma regla que el JwtStrategy de la API, en segundos).
 */
export function sessionError(
  user: { active: boolean; passwordChangedAt: Date | null } | null,
  token: { accessToken?: string; accessTokenIssuedAt?: number; accessTokenExpires?: number },
  now = Date.now(),
): "revoked" | "expired" | null {
  if (!user?.active) return "revoked";
  if (!token.accessToken || now >= (token.accessTokenExpires ?? 0)) return "expired";
  const changedAt = user.passwordChangedAt;
  if (changedAt && (token.accessTokenIssuedAt ?? 0) < Math.floor(changedAt.getTime() / 1000)) {
    return "expired";
  }
  return null;
}
