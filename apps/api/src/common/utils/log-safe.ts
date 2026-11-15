/**
 * Para los logs: «nombre@firma.ec» → «no••••@firma.ec». Basta para reconocer a quién falló un
 * envío sin guardar direcciones completas (dato personal) en los registros del servidor.
 */
export function logEmail(email: string | null | undefined): string {
  if (!email) return '(sin email)';
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}
