/**
 * Decide si una sesión web sigue siendo válida. Se evalúa en cada lectura de la
 * sesión (callback `jwt` de NextAuth) con los datos actuales del usuario en BD.
 *
 * - "revoked": el usuario no existe, está desactivado, cambió de firma o cerró esta sesión.
 * - "expired": el JWT de la API falta o caducó, o la contraseña cambió después
 *   de emitirlo (misma regla que el JwtStrategy de la API, en segundos).
 */
export function sessionError(
  user: { active: boolean; passwordChangedAt: Date | null; tenantId?: string } | null,
  token: { accessToken?: string; accessTokenIssuedAt?: number; accessTokenExpires?: number; tenantId?: string },
  now = Date.now(),
  /** El `jti` del token está en la lista de sesiones cerradas */
  revoked = false,
): "revoked" | "expired" | null {
  if (!user?.active) return "revoked";
  // Cerrar sesión revoca el token en la API: una cookie copiada antes tampoco sirve en la web
  if (revoked) return "revoked";
  // La firma de la cookie debe ser la del usuario (defensa ante una cookie falsificada)
  if (user.tenantId !== undefined && token.tenantId !== user.tenantId) return "revoked";
  if (!token.accessToken || now >= (token.accessTokenExpires ?? 0)) return "expired";
  const changedAt = user.passwordChangedAt;
  if (changedAt && (token.accessTokenIssuedAt ?? 0) < Math.floor(changedAt.getTime() / 1000)) {
    return "expired";
  }
  return null;
}
