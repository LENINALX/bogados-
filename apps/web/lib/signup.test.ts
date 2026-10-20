import { describe, expect, it } from "vitest";
import { FIRM_SLUG, passwordStrength, slugifyFirm } from "./signup";

describe("slugifyFirm", () => {
  it.each([
    ["Estudio Jurídico Mejía", "estudio-juridico-mejia"],
    ["Mejía & Asociados", "mejia-asociados"],
    ["  Bufete Núñez–Peña, S.A. ", "bufete-nunez-pena-s-a"],
    ["Ñ", "n"],
  ])("%s → %s", (name, slug) => {
    expect(slugifyFirm(name)).toBe(slug);
  });

  it("corta en una palabra completa sin pasar de 40 caracteres", () => {
    const slug = slugifyFirm("Estudio Jurídico Internacional de Derecho Laboral y Familia");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
    expect(FIRM_SLUG.test(slug)).toBe(true);
  });
});

describe("passwordStrength", () => {
  it("sube con la longitud y la variedad", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("abc").score).toBeLessThanOrEqual(1);
    expect(passwordStrength("abcdefgh").label).toBe("Débil");
    expect(passwordStrength("abcdefg1").label).toBe("Aceptable");
    expect(passwordStrength("Abogada2026-Quito").label).toBe("Fuerte");
  });

  it("por debajo de 8 caracteres nunca pasa de débil, aunque mezcle tipos", () => {
    expect(passwordStrength("Ab1!").score).toBeLessThanOrEqual(1);
  });
});
