import { describe, expect, it } from "vitest";
import { dueState, SOON_MS } from "./tasks";

const now = Date.parse("2026-09-29T12:00:00Z");
const at = (offsetMs: number) => new Date(now + offsetMs);

describe("dueState", () => {
  it("completada gana aunque esté vencida", () => {
    expect(dueState(at(-1000), true, now)).toBe("done");
  });

  it("vencida si el plazo ya pasó", () => {
    expect(dueState(at(-1), false, now)).toBe("overdue");
  });

  it("próxima si vence en los próximos 3 días (inclusive)", () => {
    expect(dueState(at(0), false, now)).toBe("soon");
    expect(dueState(at(SOON_MS), false, now)).toBe("soon");
  });

  it("en plazo si falta más de 3 días", () => {
    expect(dueState(at(SOON_MS + 1), false, now)).toBe("ok");
  });

  it("acepta fechas ISO en texto (como llegan del servidor)", () => {
    expect(dueState(at(-1).toISOString(), false, now)).toBe("overdue");
  });
});
