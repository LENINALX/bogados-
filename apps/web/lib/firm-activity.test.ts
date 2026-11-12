import { describe, expect, it } from "vitest";
import { activityApiQuery, activityHref, categoryOf, isYmd, readActivityFilters } from "./firm-activity";

const params = (q: string) => new URLSearchParams(q);

describe("readActivityFilters", () => {
  it("lee los filtros de la URL", () => {
    expect(readActivityFilters(params("grupo=citas&persona=u1&desde=2026-11-01&hasta=2026-11-11&pagina=2"), ["u1"])).toEqual({
      category: "citas",
      actorId: "u1",
      from: "2026-11-01",
      to: "2026-11-11",
      page: 2,
    });
  });

  it("ignora lo que no es válido en vez de fallar", () => {
    expect(readActivityFilters(params("grupo=hackeo&persona=otra-firma&desde=2026-02-30&hasta=ayer&pagina=-3"), ["u1"])).toEqual({
      category: "",
      actorId: "",
      from: "",
      to: "",
      page: 1,
    });
  });

  it("un rango al revés se ordena", () => {
    const f = readActivityFilters(params("desde=2026-11-11&hasta=2026-11-01"), []);
    expect([f.from, f.to]).toEqual(["2026-11-01", "2026-11-11"]);
  });
});

describe("activityHref / activityApiQuery", () => {
  const f = { category: "usuarios" as const, actorId: "", from: "2026-11-01", to: "", page: 1 };

  it("la URL va en español y sin vacíos", () => {
    expect(activityHref("/admin/actividad", f)).toBe("/admin/actividad?grupo=usuarios&desde=2026-11-01");
    expect(activityHref("/admin/actividad", { ...f, category: "", from: "" })).toBe("/admin/actividad");
  });

  it("la API recibe los nombres en inglés y nunca un filtro vacío", () => {
    expect(activityApiQuery(f, 25)).toBe("page=1&pageSize=25&category=usuarios&from=2026-11-01");
  });
});

describe("utilidades", () => {
  it("isYmd comprueba el calendario", () => {
    expect(isYmd("2028-02-29")).toBe(true);
    expect(isYmd("2026-02-29")).toBe(false);
    expect(isYmd("1999-12-31")).toBe(false);
  });

  it("categoryOf agrupa los tipos y deja sin grupo los desconocidos", () => {
    expect(categoryOf("APPOINTMENT_CANCELLED")).toBe("citas");
    expect(categoryOf("HOLIDAY_ADDED")).toBe("ajustes");
    expect(categoryOf("ALGO_NUEVO")).toBeNull();
  });
});
