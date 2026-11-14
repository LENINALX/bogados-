import { describe, expect, it } from "vitest";
import { exportFileName, exportPath } from "./exports";

describe("exportPath", () => {
  it("lleva el formato y solo los filtros con valor", () => {
    expect(exportPath("cases", "xlsx", { status: "abierto", q: "  " })).toBe("/exports/cases?format=xlsx&status=abierto");
    expect(exportPath("clients", "pdf")).toBe("/exports/clients?format=pdf");
  });

  it("codifica la búsqueda", () => {
    expect(exportPath("cases", "pdf", { q: "daños & perjuicios" })).toBe("/exports/cases?format=pdf&q=da%C3%B1os+%26+perjuicios");
  });
});

describe("exportFileName", () => {
  it("nombre en español con la fecha local", () => {
    expect(exportFileName("cases", "xlsx", new Date(2026, 10, 5))).toBe("casos-2026-11-05.xlsx");
    expect(exportFileName("clients", "pdf", new Date(2026, 0, 31))).toBe("clientes-2026-01-31.pdf");
  });
});
