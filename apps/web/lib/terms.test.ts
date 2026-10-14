import { describe, expect, it } from "vitest";
import { formatYmdLong, formatYmdShort, summarizeSkipped, todayYmd } from "./terms";

describe("formato de fechas de términos", () => {
  it("formatea el día sin desplazarse por la zona horaria", () => {
    expect(formatYmdLong("2026-10-14")).toMatch(/miércoles.*14 de octubre de 2026/);
    expect(formatYmdShort("2026-10-10")).toMatch(/sáb.*10.*oct/);
  });

  it("todayYmd devuelve AAAA-MM-DD", () => {
    expect(todayYmd(new Date(2026, 9, 13, 23, 30))).toBe("2026-10-13");
  });
});

describe("summarizeSkipped", () => {
  it("agrupa fines de semana y feriados", () => {
    expect(
      summarizeSkipped([
        { date: "2026-10-09", reason: "Independencia de Guayaquil" },
        { date: "2026-10-10", reason: "Sábado" },
        { date: "2026-10-11", reason: "Domingo" },
      ]),
    ).toBe("Se saltaron 2 días de fin de semana y 1 feriado.");
    expect(summarizeSkipped([{ date: "2026-10-10", reason: "Sábado" }])).toBe("Se saltaron 1 día de fin de semana.");
    expect(summarizeSkipped([])).toBe("No hubo días no hábiles por medio.");
  });
});
