import { describe, expect, it } from "vitest";
import { sessionError } from "./session-state";

const now = Date.parse("2026-09-29T12:00:00Z");
const nowSecs = Math.floor(now / 1000);
const validToken = {
  accessToken: "jwt",
  accessTokenIssuedAt: nowSecs - 3600,
  accessTokenExpires: now + 3600_000,
};
const activeUser = { active: true, passwordChangedAt: null };

describe("sessionError", () => {
  it("usuario activo con token vigente → sesión válida", () => {
    expect(sessionError(activeUser, validToken, now)).toBeNull();
  });

  it("usuario desactivado o borrado → revoked", () => {
    expect(sessionError({ active: false, passwordChangedAt: null }, validToken, now)).toBe("revoked");
    expect(sessionError(null, validToken, now)).toBe("revoked");
  });

  it("sin token de la API (cookie anterior al cambio) → expired", () => {
    expect(sessionError(activeUser, { ...validToken, accessToken: undefined }, now)).toBe("expired");
  });

  it("token de la API caducado → expired", () => {
    expect(sessionError(activeUser, { ...validToken, accessTokenExpires: now }, now)).toBe("expired");
  });

  it("contraseña cambiada después del login → expired", () => {
    const user = { active: true, passwordChangedAt: new Date(now - 60_000) };
    expect(sessionError(user, validToken, now)).toBe("expired");
  });

  it("login en el mismo segundo o después del cambio → válida", () => {
    const changedAt = new Date((validToken.accessTokenIssuedAt * 1000) + 400);
    expect(sessionError({ active: true, passwordChangedAt: changedAt }, validToken, now)).toBeNull();
  });
});

describe("auditoría: sesión cerrada y firma de la cookie", () => {
  const user = { active: true, passwordChangedAt: null, tenantId: "t1" };
  const token = { accessToken: "x", accessTokenIssuedAt: 1, accessTokenExpires: Date.now() + 60_000, tenantId: "t1" };

  it("token revocado (cerró sesión): la cookie copiada ya no vale", async () => {
    const { sessionError } = await import("./session-state");
    expect(sessionError(user, token, Date.now(), true)).toBe("revoked");
    expect(sessionError(user, token, Date.now(), false)).toBeNull();
  });

  it("la firma de la cookie no coincide con la del usuario: revocada", async () => {
    const { sessionError } = await import("./session-state");
    expect(sessionError(user, { ...token, tenantId: "otra" })).toBe("revoked");
  });
});
