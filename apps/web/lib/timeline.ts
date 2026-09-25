import { ActivityEvent, Prisma } from "@prisma/client";
import { CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";

export type TimelineNote = {
  kind: "note";
  id: string;
  createdAt: string;
  author: string;
  body: string;
  isInternal: boolean;
};

export type TimelineEvent = {
  kind: "event";
  id: string;
  createdAt: string;
  actor: string | null;
  type: string;
  summary: string;
};

export type TimelineItem = TimelineNote | TimelineEvent;

type EventWithActor = ActivityEvent & { actor: { name: string } | null };

/** Eventos que el cliente puede ver en el portal (lista blanca). */
const CLIENT_VISIBLE = new Set(["CASE_CREATED", "STATUS_CHANGED", "ASSIGNED", "DOC_UPLOADED"]);

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
    .map((e) => ({
      kind: "event",
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      actor: e.actor?.name ?? null,
      type: e.type,
      summary: describe(e),
    }));
}

export function toTimelineNotes(
  notes: { id: string; createdAt: Date; body: string; isInternal: boolean; author: { name: string } }[],
): TimelineNote[] {
  return notes.map((n) => ({
    kind: "note",
    id: n.id,
    createdAt: n.createdAt.toISOString(),
    author: n.author.name,
    body: n.body,
    isInternal: n.isInternal,
  }));
}
