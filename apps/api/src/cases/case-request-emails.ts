import { escapeHtml } from '../common/utils/html';

export type CaseRequestEmailKind = 'received' | 'new_request' | 'accepted' | 'postponed' | 'rejected';

const COPY: Record<CaseRequestEmailKind, { subject: string; intro: string; button: string }> = {
  received: {
    subject: 'Hemos recibido tu solicitud',
    intro: 'Hemos recibido tu solicitud y la revisaremos pronto. Te avisaremos por email cuando haya una decisión.',
    button: 'Ver mi solicitud',
  },
  new_request: {
    subject: 'Nueva solicitud de caso',
    intro: 'Un cliente ha enviado una solicitud de caso desde el portal. Acéptala, aplázala o recházala.',
    button: 'Revisar solicitud',
  },
  accepted: {
    subject: 'Tu caso ha sido aceptado',
    intro: 'Hemos aceptado tu caso. Ya puedes seguir su avance, enviar documentos y escribir a tu abogado desde el portal.',
    button: 'Ver mi caso',
  },
  postponed: {
    subject: 'Tu solicitud está en espera',
    intro: 'Hemos aplazado la decisión sobre tu solicitud. No está rechazada: te avisaremos en cuanto la retomemos.',
    button: 'Ver mi solicitud',
  },
  rejected: {
    subject: 'Sobre tu solicitud',
    intro: 'Lamentamos informarte de que en esta ocasión no podemos asumir tu caso.',
    button: 'Ver detalle',
  },
};

export function buildCaseRequestEmail(d: {
  kind: CaseRequestEmailKind;
  recipientName: string;
  tenantName: string;
  caseTitle: string;
  clientName?: string;
  lawyerName?: string;
  reason?: string | null;
  link: string;
}) {
  const copy = COPY[d.kind];
  const details = [
    `Caso: ${d.caseTitle}`,
    ...(d.clientName ? [`Cliente: ${d.clientName}`] : []),
    ...(d.lawyerName ? [`Abogado responsable: ${d.lawyerName}`] : []),
    ...(d.reason ? [`${d.kind === 'rejected' ? 'Motivo' : 'Comentario'}: ${d.reason}`] : []),
  ];
  const text = [`Hola ${d.recipientName},`, '', copy.intro, '', ...details, '', d.link].join('\n');
  const html = `
    <p>Hola ${escapeHtml(d.recipientName)},</p>
    <p>${escapeHtml(copy.intro)}</p>
    <div style="margin:16px 0;padding:12px 16px;border-left:4px solid #1e3a5f;background:#f5f7fa;border-radius:6px">
      ${details.map((line) => `<p style="margin:4px 0">${escapeHtml(line)}</p>`).join('')}
    </div>
    <p><a href="${escapeHtml(d.link)}" style="display:inline-block;padding:10px 18px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(copy.button)}</a></p>
    <p style="color:#888;font-size:12px">${escapeHtml(d.tenantName)} · Bogados</p>`;
  return { subject: `${copy.subject} · ${d.tenantName}`, text, html };
}
