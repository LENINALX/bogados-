import { describe, expect, it } from "vitest";
import { oneOf, pageParam, textParam } from "./search-params";

describe("parámetros de la URL", () => {
  it("textParam: primer valor, recortado y acotado", () => {
    expect(textParam(["a", "b"])).toBe("a");
    expect(textParam("  hola  ")).toBe("hola");
    expect(textParam("   ")).toBeUndefined();
    expect(textParam("x".repeat(500))).toHaveLength(200);
  });

  it("pageParam: siempre una página válida", () => {
    expect(pageParam("3")).toBe(3);
    expect(pageParam("9999999999999999999999")).toBe(10_000);
    expect(pageParam(["2", "5"])).toBe(2);
    expect(pageParam("-4")).toBe(1);
    expect(pageParam("abc")).toBe(1);
    expect(pageParam(undefined)).toBe(1);
  });

  it("oneOf: solo valores permitidos", () => {
    expect(oneOf("abierto", ["abierto", "cerrado"] as const)).toBe("abierto");
    expect(oneOf(["cerrado", "x"], ["abierto", "cerrado"] as const)).toBe("cerrado");
    expect(oneOf("borrado", ["abierto", "cerrado"] as const)).toBeUndefined();
  });
});
