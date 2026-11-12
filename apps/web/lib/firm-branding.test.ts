import { describe, expect, it } from "vitest";
import {
  BRAND_MIN_CONTRAST,
  BRAND_PRESETS,
  brandColorProblem,
  contrastWithWhite,
  firmLogoUrl,
  firmMonogram,
  logoFileProblem,
  normalizeWebsite,
  phoneProblem,
  websiteProblem,
} from "./firm-branding";

describe("color de marca", () => {
  it("todos los tonos sugeridos cumplen el contraste con texto blanco", () => {
    for (const p of BRAND_PRESETS) expect(contrastWithWhite(p.value)).toBeGreaterThanOrEqual(BRAND_MIN_CONTRAST);
  });

  it("vacío vale (usa el de Bogados); claro o mal escrito, no", () => {
    expect(brandColorProblem("")).toBeNull();
    expect(brandColorProblem("#7a1f2b")).toBeNull();
    expect(brandColorProblem("#f5d76e")).toMatch(/demasiado claro/);
    expect(brandColorProblem("#abc")).toMatch(/#RRGGBB/);
  });
});

describe("contacto", () => {
  it("teléfono", () => {
    expect(phoneProblem("")).toBeNull();
    expect(phoneProblem("+593 99 123 4567")).toBeNull();
    expect(phoneProblem("12-34")).toMatch(/entre 7 y 15/);
    expect(phoneProblem("099 abc")).toMatch(/Solo números/);
  });

  it("web: se completa el https:// y se rechazan esquemas peligrosos", () => {
    expect(normalizeWebsite("mifirma.ec")).toBe("https://mifirma.ec");
    expect(normalizeWebsite("http://mifirma.ec")).toBe("http://mifirma.ec");
    expect(websiteProblem(normalizeWebsite("mifirma.ec"))).toBeNull();
    expect(websiteProblem("javascript:alert(1)")).toMatch(/https/);
    expect(websiteProblem("https://localhost")).toMatch(/dominio/);
  });
});

describe("logo", () => {
  it("solo PNG, JPG o WebP de hasta 512 KB", () => {
    expect(logoFileProblem({ type: "image/png", size: 40_000 })).toBeNull();
    expect(logoFileProblem({ type: "image/svg+xml", size: 2_000 })).toMatch(/PNG, JPG o WebP/);
    expect(logoFileProblem({ type: "image/jpeg", size: 600 * 1024 })).toMatch(/512 KB/);
  });

  it("URL y monograma", () => {
    expect(firmLogoUrl("firma-demo", 123)).toBe("/api/firmas/firma-demo/logo?v=123");
    expect(firmMonogram("Firma Demo Abogados")).toBe("FD");
  });
});
