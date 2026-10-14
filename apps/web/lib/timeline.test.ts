import { describe, expect, it } from "vitest";
import { emailedNoteIds, toTimelineEvents, toTimelineNotes } from "./timeline";

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

  it("el cliente ve la solicitud y la decisión del despacho (con su motivo)", () => {
    const flow = [
      ev("CASE_REQUESTED", "Solicitud enviada desde el portal"),
      ev("CASE_POSTPONED", "Solicitud aplazada: esperamos documentos"),
      ev("CASE_REJECTED", "Solicitud no aceptada: no llevamos esa materia"),
    ];
    const client = toTimelineEvents(flow, "client");
    expect(types(client)).toEqual(["CASE_REQUESTED", "CASE_POSTPONED", "CASE_REJECTED"]);
    expect(client[2].summary).toContain("no llevamos esa materia");
  });

  it("serializa fecha y autor", () => {
    const [first] = toTimelineEvents(events, "staff");
    expect(first.createdAt).toBe("2026-09-01T10:00:00.000Z");
    expect(first.actor).toBe("Luis");
  });
});

describe("aviso al cliente", () => {
  const avisos = [
    ev("STATUS_CHANGED", "Estado: abierto → en_pausa", {
      from: "abierto",
      to: "en_pausa",
      message: "Esperamos la fecha de la audiencia.",
      emailedClient: true,
    }),
    ev("NOTE_ADDED", "Nota visible al cliente", { noteId: "n1", isInternal: false, emailedClient: true }),
    ev("NOTE_ADDED", "Nota visible al cliente", { noteId: "n2", isInternal: false }),
  ];

  it("el mensaje del cambio de estado lo ven despacho y cliente; el aviso por email solo el despacho", () => {
    const [staff] = toTimelineEvents(avisos, "staff");
    expect(staff).toMatchObject({ detail: "Esperamos la fecha de la audiencia.", emailedClient: true });
    const [client] = toTimelineEvents(avisos, "client");
    expect(client.detail).toBe("Esperamos la fecha de la audiencia.");
    expect(client).not.toHaveProperty("emailedClient");
  });

  it("marca las notas de las que se avisó por email", () => {
    const ids = emailedNoteIds(avisos);
    expect([...ids]).toEqual(["n1"]);
    const nota = (id: string) => ({ id, createdAt: new Date(), body: "x", isInternal: false, author: { name: "Luis" } });
    const [n1, n2] = toTimelineNotes([nota("n1"), nota("n2")], ids);
    expect(n1.emailedClient).toBe(true);
    expect(n2).not.toHaveProperty("emailedClient");
  });
});
