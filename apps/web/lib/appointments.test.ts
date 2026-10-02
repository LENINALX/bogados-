import { describe, expect, it } from "vitest";
import { dayKey, formatDay, formatTime, groupByDay } from "./appointments";

const GYE = "America/Guayaquil";

describe("formato de citas en la zona de la firma", () => {
  it("14:00 UTC son las 09:00 en Guayaquil", () => {
    expect(formatTime("2026-10-05T14:00:00Z", GYE)).toBe("09:00");
  });

  it("las 03:00 UTC aún son el día anterior en Guayaquil", () => {
    expect(dayKey("2026-10-06T03:00:00Z", GYE)).toBe("2026-10-05");
  });

  it("formatDay en español y con mayúscula inicial", () => {
    expect(formatDay("2026-10-05T14:00:00Z", GYE)).toBe("Lunes, 5 de octubre");
  });

  it("groupByDay agrupa por día local respetando el orden", () => {
    const items = [
      { id: "a", startsAt: "2026-10-05T14:00:00Z" },
      { id: "b", startsAt: "2026-10-06T02:00:00Z" }, // 21:00 del lunes en Guayaquil
      { id: "c", startsAt: "2026-10-06T14:00:00Z" },
    ];
    const groups = groupByDay(items, GYE);
    expect(groups.map((g) => [g.day, g.items.map((i) => i.id)])).toEqual([
      ["2026-10-05", ["a", "b"]],
      ["2026-10-06", ["c"]],
    ]);
  });
});
