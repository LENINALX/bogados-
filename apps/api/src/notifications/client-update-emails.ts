import { escapeHtml } from '../common/utils/html';

/** Novedad del caso que el despacho decide contar al cliente. */
export type ClientUpdate =
  | { kind: 'status'; from: string; to: string; message?: string | null }
  | { kind: 'note'; body: string };

/** Nombres de los estados tal como los ve el cliente (la API no importa @bogados/shared). */
export const CLIENT_STATUS_LABELS: Record<string, string> = {
  intake: 'Ingreso',
  abierto: 'Abierto',
  en_pausa: 'En pausa',
  cerrado: 'Cerrado',
};

/** Qué significa cada estado, en palabras de cliente y no de expediente. */
const STATUS_MEANING: Record<string, string> = {
  intake: 'Estamos estudiando tu caso para empezar a trabajar en él.',
  abierto: 'Tu caso está en trámite y tu abogado está trabajando en él.',
  en_pausa: 'Tu caso está detenido por ahora. Se retomará en cuanto sea posible.',
  cerrado: 'Tu caso ha concluido.',
};

export function clientStatusLabel(status: string): string {
  return CLIENT_STATUS_LABELS[status] ?? status;
}

export function buildClientUpdateEmail(d: {
  update: ClientUpdate;
  recipientName: string;
  tenantName: string;
  caseTitle: string;
  lawyerName?: string | null;
  link: string;
}) {
  const { update } = d;
  const subject =
    update.kind === 'status'
      ? `Tu caso «${d.caseTitle}» ahora está: ${clientStatusLabel(update.to)}`
      : `Novedad en tu caso «${d.caseTitle}»`;
  const intro =
    update.kind === 'status'
      ? (STATUS_MEANING[update.to] ?? 'El estado de tu caso ha cambiado.')
      : 'Tu abogado ha publicado una novedad sobre tu caso.';
  const details = [
    `Caso: ${d.caseTitle}`,
    ...(update.kind === 'status'
      ? [`Estado: ${clientStatusLabel(update.from)} → ${clientStatusLabel(update.to)}`]
      : []),
    ...(d.lawyerName ? [`Abogado responsable: ${d.lawyerName}`] : []),
  ];
  const message = update.kind === 'status' ? update.message?.trim() : update.body.trim();
  const messageLabel = update.kind === 'status' ? 'Mensaje de tu abogado' : 'Novedad';

  const text = [
    `Hola ${d.recipientName},`,
    '',
    intro,
    '',
    ...details,
    ...(message ? ['', `${messageLabel}:`, message] : []),
    '',
    `Puedes verlo en tu portal: ${d.link}`,
    '',
    `Recibes este aviso porque eres cliente de ${d.tenantName}.`,
  ].join('\n');

  const html = `
    <p>Hola ${escapeHtml(d.recipientName)},</p>
    <p>${escapeHtml(intro)}</p>
    <div style="margin:16px 0;padding:12px 16px;border-left:4px solid #1f3d38;background:#f4efe4;border-radius:6px">
      ${details.map((line) => `<p style="margin:4px 0">${escapeHtml(line)}</p>`).join('')}
    </div>
    ${
      message
        ? `<p style="margin:16px 0 4px;font-weight:600">${escapeHtml(messageLabel)}</p>
    <p style="margin:0 0 16px;white-space:pre-line">${escapeHtml(message)}</p>`
        : ''
    }
    <p><a href="${escapeHtml(d.link)}" style="display:inline-block;padding:10px 18px;background:#1f3d38;color:#fff;border-radius:8px;text-decoration:none">Ver mi caso</a></p>
    <p style="color:#888;font-size:12px">Recibes este aviso porque eres cliente de ${escapeHtml(d.tenantName)} · Bogados</p>`;

  return { subject: `${subject} · ${d.tenantName}`, text, html };
}
