import { describe, expect, it } from "vitest";
import { isValidProcessNumber, normalizeProcessNumber } from "./process-number";

describe("número de proceso", () => {
  it("normaliza espacios y mayúsculas; vacío desvincula", () => {
    expect(normalizeProcessNumber(" 13284-2024-00123g ")).toBe("13284-2024-00123G");
    expect(normalizeProcessNumber("13284 - 2024 - 00123")).toBe("13284-2024-00123");
    expect(normalizeProcessNumber("   ")).toBeNull();
  });

  it("acepta el formato del SATJE, con letra final opcional", () => {
    expect(isValidProcessNumber("13284-2024-00123")).toBe(true);
    expect(isValidProcessNumber("09332-2019-02345G")).toBe(true);
  });

  it("rechaza otros formatos", () => {
    for (const bad of ["123", "13284-24-00123", "13284-2024-123", "ABCDE-2024-00123", "13284-2024-00123GG"]) {
      expect(isValidProcessNumber(bad)).toBe(false);
    }
  });
});
