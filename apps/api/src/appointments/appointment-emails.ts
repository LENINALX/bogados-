import { escapeHtml } from '../common/utils/html';

export type AppointmentEmailKind = 'requested' | 'confirmed' | 'cancelled' | 'reminder';

export type AppointmentEmailData = {
  kind: AppointmentEmailKind;
  recipientName: string;
  tenantName: string;
  /** Con quién es la cita, desde el punto de vista del destinatario */
  counterpartName: string;
  startsAt: Date;
  timeZone: string;
  reason?: string | null;
  note?: string | null;
  link: string;
};

/** "lunes, 5 de octubre de 2026, 09:00" en la zona horaria de la firma. */
export function formatAppointmentDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(at);
}

const COPY: Record<AppointmentEmailKind, { subject: string; intro: string; button: string }> = {
  requested: {
    subject: 'Nueva solicitud de cita',
    intro: 'te ha pedido una cita. Confírmala o cancélala desde la agenda.',
    button: 'Ver agenda',
  },
  confirmed: {
    subject: 'Cita confirmada',
    intro: 'ha confirmado tu cita.',
    button: 'Ver mis citas',
  },
  cancelled: {
    subject: 'Cita cancelada',
    intro: 'ha cancelado la cita.',
    button: 'Ver citas',
  },
  // Se envía cuando falta menos de 24 h: no se dice "mañana" porque puede ser hoy
  reminder: {
    subject: 'Recordatorio de tu próxima cita',
    intro: 'te espera en la cita programada.',
    button: 'Ver mis citas',
  },
};

export function buildAppointmentEmail(d: AppointmentEmailData) {
  const copy = COPY[d.kind];
  const when = formatAppointmentDate(d.startsAt, d.timeZone);
  const subject = `${copy.subject} · ${d.tenantName}`;
  const lines = [
    `Hola ${d.recipientName},`,
    '',
    `${d.counterpartName} ${copy.intro}`,
    '',
    `Fecha: ${when}`,
    ...(d.reason ? [`Motivo: ${d.reason}`] : []),
    ...(d.note ? [`Comentario: ${d.note}`] : []),
    '',
    d.link,
  ];
  const text = lines.join('\n');

  const extra = [
    d.reason ? `<p style="margin:4px 0"><strong>Motivo:</strong> ${escapeHtml(d.reason)}</p>` : '',
    d.note ? `<p style="margin:4px 0"><strong>Comentario:</strong> ${escapeHtml(d.note)}</p>` : '',
  ].join('');
  const html = `
    <p>Hola ${escapeHtml(d.recipientName)},</p>
    <p>${escapeHtml(d.counterpartName)} ${escapeHtml(copy.intro)}</p>
    <div style="margin:16px 0;padding:12px 16px;border-left:4px solid #1e3a5f;background:#f5f7fa;border-radius:6px">
      <p style="margin:4px 0;font-size:16px"><strong>${escapeHtml(when)}</strong></p>
      ${extra}
    </div>
    <p><a href="${escapeHtml(d.link)}" style="display:inline-block;padding:10px 18px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(copy.button)}</a></p>
    <p style="color:#888;font-size:12px">${escapeHtml(d.tenantName)} · Bogados</p>`;

  return { subject, text, html };
}
