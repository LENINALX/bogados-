import { describe, expect, it } from "vitest";
import { dayBounds, dueBucket, zonedMidnight } from "./today";

const GYE = "America/Guayaquil"; // UTC−5, sin horario de verano

describe("dayBounds", () => {
  it("hoy se decide en la zona del bufete, no en UTC", () => {
    // 15 oct 2026, 02:00 UTC = 14 oct, 21:00 en Guayaquil (miércoles)
    const b = dayBounds(new Date("2026-10-15T02:00:00Z"), GYE);
    expect(b.today).toBe("2026-10-14");
    expect(b.startOfToday.toISOString()).toBe("2026-10-14T05:00:00.000Z");
    expect(b.startOfTomorrow.toISOString()).toBe("2026-10-15T05:00:00.000Z");
    // Esta semana llega hasta el domingo 18 incluido
    expect(b.endOfWeek.toISOString()).toBe("2026-10-19T05:00:00.000Z");
  });

  it("en domingo, la semana termina ese mismo día", () => {
    const b = dayBounds(new Date("2026-10-18T15:00:00Z"), GYE);
    expect(b.today).toBe("2026-10-18");
    expect(b.endOfWeek.toISOString()).toBe("2026-10-19T05:00:00.000Z");
  });

  it("en lunes, la semana es la semana entera", () => {
    const b = dayBounds(new Date("2026-10-19T15:00:00Z"), GYE);
    expect(b.endOfWeek.toISOString()).toBe("2026-10-26T05:00:00.000Z");
  });

  it("respeta los cambios de hora (Madrid, 25 oct 2026)", () => {
    expect(zonedMidnight("2026-10-25", "Europe/Madrid").toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(zonedMidnight("2026-10-26", "Europe/Madrid").toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("dueBucket", () => {
  const now = new Date("2026-10-14T15:00:00Z"); // miércoles 10:00 en Guayaquil
  const b = dayBounds(now, GYE);

  it("clasifica vencidos, hoy, esta semana y más adelante", () => {
    expect(dueBucket(new Date("2026-10-14T14:00:00Z"), now, b)).toBe("overdue");
    // Un término vence a las 23:59 del día: sigue siendo de hoy
    expect(dueBucket(new Date("2026-10-15T04:59:00Z"), now, b)).toBe("today");
    expect(dueBucket(new Date("2026-10-19T04:59:00Z"), now, b)).toBe("week");
    expect(dueBucket(new Date("2026-10-19T05:00:00Z"), now, b)).toBe("later");
  });
});
