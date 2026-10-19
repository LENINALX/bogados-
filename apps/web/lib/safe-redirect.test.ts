import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./safe-redirect";

const ORIGIN = "http://localhost:3000";

describe("safeCallbackPath", () => {
  it("vuelve a la página protegida que se intentaba abrir", () => {
    expect(safeCallbackPath("http://localhost:3000/casos/abc?tab=docs#notas", ORIGIN)).toBe("/casos/abc?tab=docs#notas");
    expect(safeCallbackPath("/portal/citas", ORIGIN)).toBe("/portal/citas");
  });

  it.each([
    ["otro dominio", "https://evil.example/robar"],
    ["protocolo relativo", "//evil.example/robar"],
    ["barra invertida", "/\\evil.example"],
    ["javascript:", "javascript:alert(1)"],
    ["mismo host, otro puerto", "http://localhost:4000/casos"],
  ])("rechaza %s (open redirect)", (_caso, url) => {
    expect(safeCallbackPath(url, ORIGIN)).toBe("/");
  });

  it("no vuelve a las pantallas de acceso", () => {
    expect(safeCallbackPath("/login?error=expired", ORIGIN)).toBe("/");
    expect(safeCallbackPath("/api/auth/signout", ORIGIN)).toBe("/");
  });

  it("sin destino: la portada, que redirige según el rol", () => {
    expect(safeCallbackPath(null, ORIGIN)).toBe("/");
  });
});
