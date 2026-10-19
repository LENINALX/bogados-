import { describe, expect, it } from "vitest";
import { decodeLoginOutcome, encodeLoginOutcome, LoginOutcome, loginOutcomeMessage } from "./auth-errors";

describe("codificación del resultado del login", () => {
  it.each<LoginOutcome>([
    { kind: "invalid", remaining: 3 },
    { kind: "locked", retryAfterSeconds: 840 },
    {
      kind: "two_factor",
      challenge: { challengeId: "c1", emailHint: "an•••@x.com", expiresAt: "2026-10-19T15:00:00Z", resendAvailableAt: "2026-10-19T14:51:00Z" },
    },
    { kind: "bad_code", message: "El código no es correcto. Te quedan 2 intentos.", remaining: 2 },
  ])("ida y vuelta: %o", (outcome) => {
    // NextAuth lo pasa por la URL: se simula esa codificación extra
    const viaUrl = new URL(`http://x/?error=${encodeURIComponent(encodeLoginOutcome(outcome))}`).searchParams.get("error");
    expect(decodeLoginOutcome(viaUrl)).toEqual(outcome);
  });

  it("entiende los códigos propios de NextAuth y los errores desconocidos", () => {
    expect(decodeLoginOutcome("CredentialsSignin")).toEqual({ kind: "invalid" });
    expect(decodeLoginOutcome("TOO_MANY_ATTEMPTS")).toEqual({ kind: "locked" });
    expect(decodeLoginOutcome(undefined)).toEqual({ kind: "unavailable" });
    expect(decodeLoginOutcome("BGD:%%%")).toEqual({ kind: "unavailable" });
  });
});

describe("loginOutcomeMessage", () => {
  it("no menciona los intentos mientras quedan muchos", () => {
    expect(loginOutcomeMessage({ kind: "invalid", remaining: 4 })).not.toContain("intento");
  });

  it("avisa cuando quedan pocos y del bloqueo al agotarlos", () => {
    expect(loginOutcomeMessage({ kind: "invalid", remaining: 3 })).toContain("Te quedan 3 intentos");
    expect(loginOutcomeMessage({ kind: "invalid", remaining: 1 })).toContain("Te queda 1 intento");
    expect(loginOutcomeMessage({ kind: "invalid", remaining: 0 })).toContain("bloqueada 15 minutos");
  });

  it("el bloqueo dice cuánto esperar, redondeando hacia arriba", () => {
    expect(loginOutcomeMessage({ kind: "locked", retryAfterSeconds: 61 })).toContain("espera 2 minutos");
    expect(loginOutcomeMessage({ kind: "locked", retryAfterSeconds: 30 })).toContain("espera 1 minuto ");
  });

  it("el mensaje de credenciales no revela qué dato falló", () => {
    expect(loginOutcomeMessage({ kind: "invalid" })).toBe(
      "El código de firma, el email o la contraseña no son correctos. Revísalos e inténtalo de nuevo.",
    );
  });
});
