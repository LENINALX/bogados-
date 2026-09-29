import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({ getSession: vi.fn(), signOut: vi.fn() }));

import { getSession, signOut } from "next-auth/react";

const fetchMock = vi.fn();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** nest-api guarda el token y el estado de cierre en memoria: módulo nuevo por test. */
async function load() {
  vi.resetModules();
  return import("./nest-api");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getSession).mockResolvedValue({ accessToken: "jwt-1" } as never);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("nestFetch", () => {
  it("envía el JWT de la sesión y desenvuelve `data`", async () => {
    const { nestFetch } = await load();
    fetchMock.mockResolvedValue(json(200, { success: true, data: { id: "c1" } }));

    await expect(nestFetch("/cases/c1")).resolves.toEqual({ id: "c1" });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-1");
  });

  it("pide la sesión una sola vez para varias llamadas", async () => {
    const { nestFetch } = await load();
    fetchMock.mockImplementation(async () => json(200, { data: {} }));

    await Promise.all([nestFetch("/a"), nestFetch("/b"), nestFetch("/c")]);
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("401 → cierra la sesión una sola vez aunque fallen varias peticiones", async () => {
    const { nestFetch, NestApiError } = await load();
    fetchMock.mockImplementation(async () => json(401, { error: "Token inválido" }));

    const results = await Promise.allSettled([nestFetch("/a"), nestFetch("/b")]);
    for (const r of results) {
      expect(r.status).toBe("rejected");
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(NestApiError);
      expect((r as PromiseRejectedResult).reason.status).toBe(401);
    }
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login?error=expired" });
  });

  it("sesión revocada → no llama a la API y cierra la sesión", async () => {
    vi.mocked(getSession).mockResolvedValue({ error: "revoked" } as never);
    const { nestFetch } = await load();

    await expect(nestFetch("/cases")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("otros errores → NestApiError con el mensaje de la API, sin cerrar sesión", async () => {
    const { nestFetch } = await load();
    fetchMock.mockResolvedValue(json(400, { error: "Tipo de archivo no permitido" }));

    await expect(nestFetch("/cases/c1/documents")).rejects.toMatchObject({
      message: "Tipo de archivo no permitido",
      status: 400,
    });
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("nestPublicFetch", () => {
  it("no envía token ni toca la sesión", async () => {
    const { nestPublicFetch } = await load();
    fetchMock.mockResolvedValue(json(200, { data: { ok: true } }));

    await expect(nestPublicFetch("/auth/forgot-password", { email: "a@b.co" })).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.stringify(init.headers ?? {})).not.toContain("Authorization");
    expect(getSession).not.toHaveBeenCalled();
  });
});
