import { describe, expect, it } from "vitest";
import { formatAverageDuration, recentMonths } from "./stats";

const GYE = "America/Guayaquil";

describe("recentMonths", () => {
  it("devuelve 12 meses terminando en el actual, del más antiguo al más reciente", () => {
    const months = recentMonths(new Date("2026-10-12T15:00:00Z"), GYE);
    expect(months).toHaveLength(12);
    expect(months[0].key).toBe("2025-11");
    expect(months[11].key).toBe("2026-10");
    expect(months[11].label).toBe("oct");
  });

  it("usa el mes local del bufete, no el de UTC", () => {
    // 1 de noviembre 02:00 UTC = 31 de octubre 21:00 en Guayaquil
    const months = recentMonths(new Date("2026-11-01T02:00:00Z"), GYE);
    expect(months[11].key).toBe("2026-10");
  });

  it("cruza el cambio de año", () => {
    const months = recentMonths(new Date("2026-02-10T12:00:00Z"), GYE, 3);
    expect(months.map((m) => m.key)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("formatAverageDuration", () => {
  it("muestra días a partir de un día", () => {
    expect(formatAverageDuration(2.46)).toEqual({ value: "2,5", unit: "días" });
    expect(formatAverageDuration(1)).toEqual({ value: "1", unit: "día" });
  });

  it("muestra horas por debajo de un día", () => {
    expect(formatAverageDuration(0.125)).toEqual({ value: "3", unit: "horas" });
  });

  it("no muestra «0» para decisiones casi inmediatas", () => {
    expect(formatAverageDuration(0.001)).toEqual({ value: "< 1", unit: "hora" });
  });
});
