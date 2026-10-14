import { ActivityEvent, Prisma } from "@prisma/client";
import { CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";

export type TimelineNote = {
  kind: "note";
  id: string;
  createdAt: string;
  author: string;
  body: string;
  isInternal: boolean;
  /** Solo despacho: se avisó al cliente por email al publicarla. */
  emailedClient?: boolean;
};

export type TimelineEvent = {
  kind: "event";
  id: string;
  createdAt: string;
  actor: string | null;
  type: string;
  summary: string;
  /** Explicación escrita para el cliente (p. ej. al cambiar el estado). */
  detail?: string;
  /** Solo despacho: se avisó al cliente por email. */
  emailedClient?: boolean;
};

export type TimelineItem = TimelineNote | TimelineEvent;

type EventWithActor = ActivityEvent & { actor: { name: string } | null };

/** Eventos que el cliente puede ver en el portal (lista blanca). */
const CLIENT_VISIBLE = new Set([
  "CASE_CREATED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "DOC_UPLOADED",
  // El número de proceso es público en el SATJE y le sirve al cliente para seguir su caso
  "PROCESS_LINKED",
  // Solicitud desde el portal y decisión del despacho (el motivo va dirigido al cliente)
  "CASE_REQUESTED",
  "CASE_ACCEPTED",
  "CASE_POSTPONED",
  "CASE_REJECTED",
]);

function meta(e: ActivityEvent) {
  return (e.meta ?? {}) as Prisma.JsonObject;
}

function statusLabel(s: unknown) {
  return CASE_STATUS_LABELS[s as CaseStatus] ?? String(s);
}

function describe(e: ActivityEvent) {
  const m = meta(e);
  if (e.type === "STATUS_CHANGED" && m.from && m.to) {
    return `Estado: ${statusLabel(m.from)} → ${statusLabel(m.to)}`;
  }
  if (e.type === "DOC_UPLOADED" && m.sharedWithClient) {
    return `${e.summary} (compartido con cliente)`;
  }
  return e.summary;
}

/**
 * Convierte eventos de auditoría en items de timeline, filtrando por audiencia.
 * NOTE_ADDED y MESSAGE_SENT se omiten: las notas se muestran completas y los
 * mensajes ya tienen su propio panel.
 */
export function toTimelineEvents(
  events: EventWithActor[],
  audience: "staff" | "client",
): TimelineEvent[] {
  return events
    .filter((e) => e.type !== "NOTE_ADDED" && e.type !== "MESSAGE_SENT")
    .filter((e) => {
      if (audience === "staff") return true;
      if (!CLIENT_VISIBLE.has(e.type)) return false;
      return e.type !== "DOC_UPLOADED" || meta(e).sharedWithClient === true;
    })
    .map((e) => {
      const m = meta(e);
      return {
        kind: "event" as const,
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        actor: e.actor?.name ?? null,
        type: e.type,
        summary: describe(e),
        ...(typeof m.message === "string" && m.message ? { detail: m.message } : {}),
        ...(audience === "staff" && m.emailedClient === true ? { emailedClient: true } : {}),
      };
    });
}

/** Notas visibles de las que se avisó al cliente por email (según su evento NOTE_ADDED). */
export function emailedNoteIds(events: ActivityEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const e of events) {
    const m = meta(e);
    if (e.type === "NOTE_ADDED" && m.emailedClient === true && typeof m.noteId === "string") ids.add(m.noteId);
  }
  return ids;
}

export function toTimelineNotes(
  notes: { id: string; createdAt: Date; body: string; isInternal: boolean; author: { name: string } }[],
  /** Solo para el despacho: el cliente no necesita saber por qué canal se le avisó. */
  emailed?: Set<string>,
): TimelineNote[] {
  return notes.map((n) => ({
    kind: "note",
    id: n.id,
    createdAt: n.createdAt.toISOString(),
    author: n.author.name,
    body: n.body,
    isInternal: n.isInternal,
    ...(emailed?.has(n.id) ? { emailedClient: true } : {}),
  }));
}
