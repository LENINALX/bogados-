import { describe, expect, it } from "vitest";
import { checkTimeBlocks, checkUpload, clean, firstError, hasErrors, isRealYmd, LIMITS, rules, validate } from "./validation";

describe("rules", () => {
  it("required ignora los espacios", () => {
    expect(rules.required()("   ")).toBeTruthy();
    expect(rules.required()(" a ")).toBeNull();
  });

  it("email: formato y longitud; vacío lo decide required", () => {
    const email = rules.email();
    expect(email("")).toBeNull();
    expect(email("ana@firma.ec")).toBeNull();
    expect(email("ana@firma")).toBeTruthy();
    expect(email("ana firma@x.ec")).toBeTruthy();
    expect(email(`${"a".repeat(250)}@x.ec`)).toBeTruthy();
  });

  it("email: sin tildes, ñ, comas ni espacios, con el motivo exacto", () => {
    const email = rules.email();
    expect(email("josé@firma.ec")).toContain("tildes");
    expect(email("ana@firmá.ec")).toContain("tildes");
    expect(email("peña@firma.ec")).toContain("ñ");
    expect(email("ana,perez@firma.ec")).toContain("comas");
    expect(email("ana@firma.ec;otro@x.ec")).toContain("punto y coma");
    expect(email("ana..perez@firma")).toBeTruthy();
    expect(email("ana.perez+casos@mi-firma.com.ec")).toBeNull();
  });

  it("maxLength dice cuánto sobra", () => {
    expect(rules.maxLength(5)("123456")).toContain("llevas 6");
    expect(rules.maxLength(5)("12345")).toBeNull();
  });

  it("newPassword: mínimo, máximo y no solo espacios", () => {
    const p = rules.newPassword();
    expect(p("")).toBeTruthy();
    expect(p("        ")).toContain("espacios");
    expect(p("corta")).toContain(String(LIMITS.password.min));
    expect(p("x".repeat(73))).toContain(String(LIMITS.password.max));
    expect(p("una-clave-larga")).toBeNull();
  });

  it("matches compara con el otro campo", () => {
    let a = "secreta-1";
    const m = rules.matches(() => a);
    expect(m("secreta-1")).toBeNull();
    a = "otra";
    expect(m("secreta-1")).toBeTruthy();
  });
});

describe("validate", () => {
  it("devuelve el primer error de cada campo y el orden para el foco", () => {
    const errors = validate(
      { email: "", title: "x" },
      { email: [rules.required("Falta el email."), rules.email()], title: [rules.required(), rules.minLength(2)] },
    );
    expect(errors).toEqual({ email: "Falta el email.", title: "Escribe al menos 2 caracteres." });
    expect(hasErrors(errors)).toBe(true);
    expect(firstError(errors, ["title", "email"])).toBe("title");
    expect(hasErrors(validate({ email: "a@b.ec" }, { email: [rules.email()] }))).toBe(false);
  });
});

describe("clean", () => {
  it("quita espacios y caracteres invisibles pegados", () => {
    expect(clean("  ana\u200B@firma.ec\u0000 ")).toBe("ana@firma.ec");
  });
});

describe("reglas de números y fechas", () => {
  it("integer: entero dentro del rango; vacío lo decide required", () => {
    const r = rules.integer(1, 90);
    expect(r("")).toBeNull();
    expect(r("3")).toBeNull();
    expect(r("0")).toContain("entre 1 y 90");
    expect(r("91")).toBeTruthy();
    expect(r("2.5")).toBeTruthy();
    expect(r("abc")).toBeTruthy();
  });

  it("date: formato y que el día exista", () => {
    expect(isRealYmd("2026-02-28")).toBe(true);
    expect(isRealYmd("2026-02-31")).toBe(false);
    expect(isRealYmd("2028-02-29")).toBe(true);
    expect(rules.date()("2026-13-01")).toBeTruthy();
    expect(rules.date()("")).toBeNull();
  });

  it("dateBetween respeta los extremos", () => {
    const r = rules.dateBetween("2026-01-01", "2026-12-31", "Fuera de 2026");
    expect(r("2026-01-01")).toBeNull();
    expect(r("2026-12-31")).toBeNull();
    expect(r("2025-12-31")).toBe("Fuera de 2026");
    expect(rules.dateBetween(null, "2026-10-20", "x")("2026-10-21")).toBe("x");
  });

  it("dateTime y future", () => {
    expect(rules.dateTime()("2026-10-20T09:30")).toBeNull();
    expect(rules.dateTime()("2026-10-20")).toBeTruthy();
    const now = () => new Date("2026-10-20T10:00").getTime();
    expect(rules.future(undefined, now)("2026-10-20T09:59")).toBeTruthy();
    expect(rules.future(undefined, now)("2026-10-20T10:01")).toBeNull();
  });

  it("processNumber normaliza antes de comprobar", () => {
    const r = rules.processNumber();
    expect(r("")).toBeNull();
    expect(r(" 13284-2024-00123 ")).toBeNull();
    expect(r("13284-2024-00123a")).toBeNull();
    expect(r("13284-24-123")).toContain("SATJE");
  });
});

describe("checkUpload", () => {
  it("tipo, vacío y tamaño máximo como la API", () => {
    expect(checkUpload(null)).toBeTruthy();
    expect(checkUpload({ name: "demanda.PDF", size: 2048 })).toBeNull();
    expect(checkUpload({ name: "virus.exe", size: 10 })).toContain(".exe");
    expect(checkUpload({ name: "sin-extension", size: 10 })).toBeTruthy();
    expect(checkUpload({ name: "vacio.txt", size: 0 })).toContain("vacío");
    expect(checkUpload({ name: "grande.pdf", size: LIMITS.upload.maxBytes })).toBeNull();
    expect(checkUpload({ name: "grande.pdf", size: LIMITS.upload.maxBytes + 1 })).toContain("máximo");
  });
});

describe("checkTimeBlocks", () => {
  it("inicio antes del fin y sin solapes el mismo día", () => {
    expect(
      checkTimeBlocks([
        { weekday: 1, start: "09:00", end: "13:00" },
        { weekday: 1, start: "13:00", end: "17:00" },
        { weekday: 2, start: "09:00", end: "13:00" },
      ]),
    ).toEqual([null, null, null]);
    const [a, b, c, d] = checkTimeBlocks([
      { weekday: 1, start: "09:00", end: "13:00" },
      { weekday: 1, start: "12:00", end: "14:00" },
      { weekday: 3, start: "10:00", end: "10:00" },
      { weekday: 4, start: "", end: "12:00" },
    ]);
    expect(a).toContain("12:00 a 14:00");
    expect(b).toContain("09:00 a 13:00");
    expect(c).toContain("posterior");
    expect(d).toBeTruthy();
  });
});
