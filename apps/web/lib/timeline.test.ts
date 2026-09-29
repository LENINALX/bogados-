import { describe, expect, it } from "vitest";
import { toTimelineEvents } from "./timeline";

type Ev = Parameters<typeof toTimelineEvents>[0][number];

let seq = 0;
function ev(type: string, summary: string, meta: Record<string, unknown> | null = null): Ev {
  seq++;
  return {
    id: `e${seq}`,
    tenantId: "t1",
    caseId: "c1",
    actorId: "u1",
    type,
    summary,
    meta: meta as Ev["meta"],
    createdAt: new Date(`2026-09-${String(seq).padStart(2, "0")}T10:00:00Z`),
    actor: { name: "Luis" },
  };
}

const events = [
  ev("CASE_CREATED", "Caso creado: Demanda"),
  ev("STATUS_CHANGED", "Estado: intake → abierto", { from: "intake", to: "abierto" }),
  ev("DOC_UPLOADED", "Documento: estrategia.pdf", { sharedWithClient: false }),
  ev("DOC_UPLOADED", "Documento: demanda.pdf", { sharedWithClient: true }),
  ev("NOTE_ADDED", "Nota interna agregada", { isInternal: true }),
  ev("MESSAGE_SENT", "Mensaje enviado"),
  ev("ASSIGNED", "Abogado asignado: Luis"),
  ev("TASK_SOMETHING_NEW", "Evento no previsto"),
];

const types = (items: { type: string }[]) => items.map((i) => i.type);

describe("toTimelineEvents", () => {
  it("el cliente no ve documentos internos ni eventos fuera de la lista blanca", () => {
    const client = toTimelineEvents(events, "client");
    expect(types(client)).toEqual(["CASE_CREATED", "STATUS_CHANGED", "DOC_UPLOADED", "ASSIGNED"]);
    expect(client.map((i) => i.summary).join(" ")).not.toContain("estrategia.pdf");
  });

  it("el staff ve todo salvo notas y mensajes (tienen su propio panel)", () => {
    const staff = toTimelineEvents(events, "staff");
    expect(types(staff)).not.toContain("NOTE_ADDED");
    expect(types(staff)).not.toContain("MESSAGE_SENT");
    expect(staff).toHaveLength(events.length - 2);
  });

  it("traduce los estados y marca los documentos compartidos", () => {
    const staff = toTimelineEvents(events, "staff");
    expect(staff.find((e) => e.type === "STATUS_CHANGED")?.summary).toBe("Estado: Ingreso → Abierto");
    expect(staff.map((e) => e.summary)).toContain("Documento: demanda.pdf (compartido con cliente)");
  });

  it("serializa fecha y autor", () => {
    const [first] = toTimelineEvents(events, "staff");
    expect(first.createdAt).toBe("2026-09-01T10:00:00.000Z");
    expect(first.actor).toBe("Luis");
  });
});
