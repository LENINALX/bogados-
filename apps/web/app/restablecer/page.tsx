"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nestPublicFetch } from "@/lib/nest-api";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";

/** Igual que PASSWORD_MIN/MAX de la API (bcrypt usa como máximo 72 bytes). */
const MIN = 8;
const MAX = 72;

type TokenInfo = {
  type: "INVITE" | "RESET";
  name: string;
  email: string;
  tenantName: string;
  tenantSlug: string;
};

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validar el enlace antes de pedir la contraseña: un enlace caducado se detecta al abrirlo
  useEffect(() => {
    if (!token) {
      setInvalid("Falta el enlace. Ábrelo desde el email que recibiste.");
      return;
    }
    nestPublicFetch<TokenInfo>(`/auth/token-info?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((err) => setInvalid(errorMessage(err, "El enlace no es válido o ha caducado.")));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await nestPublicFetch<{ email: string; tenantSlug: string }>(
        "/auth/reset-password",
        { token, password },
      );
      const sp = new URLSearchParams({ ok: "password", firma: res.tenantSlug, email: res.email });
      router.push(`/login?${sp.toString()}`);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar la contraseña. Inténtalo de nuevo."));
      setLoading(false);
    }
  }

  if (invalid) {
    return (
      <AuthShell title="Enlace no válido">
        <FormMessage type="error">{invalid}</FormMessage>
        <p className="mt-4 text-sm text-slate-600">
          Los enlaces caducan (1 hora para recuperar la contraseña, 7 días las invitaciones) y solo se
          pueden usar una vez.
        </p>
        <Link href="/recuperar" className="btn-primary mt-6 w-full">
          Pedir un enlace nuevo
        </Link>
      </AuthShell>
    );
  }

  if (!info) {
    return (
      <AuthShell title="Comprobando enlace…">
        <div className="flex justify-center py-6 text-slate-400">
          <Spinner className="h-6 w-6" />
        </div>
      </AuthShell>
    );
  }

  const invite = info.type === "INVITE";
  return (
    <AuthShell title={invite ? "Activa tu cuenta" : "Nueva contraseña"}>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        {invite ? "Bienvenido/a" : "Hola"}, <span className="font-medium text-slate-800">{info.name}</span>.{" "}
        {invite ? "Elige una contraseña para entrar en" : "Elige una contraseña nueva para tu cuenta de"}{" "}
        <span className="font-medium text-slate-800">{info.tenantName}</span>.
      </p>
      {error && (
        <div className="mb-4">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Oculto: ayuda al gestor de contraseñas a asociarla a la cuenta correcta */}
        <input type="email" name="username" autoComplete="username" value={info.email} readOnly hidden />
        <div>
          <label htmlFor="password" className="label">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoFocus
            minLength={MIN}
            maxLength={MAX}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1 text-xs text-slate-500">
            Mínimo {MIN} caracteres.
          </p>
        </div>
        <div>
          <label htmlFor="confirm" className="label">
            Repite la contraseña
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={MIN}
            maxLength={MAX}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input mt-1"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading && <Spinner />}
          {loading ? "Guardando…" : invite ? "Activar cuenta" : "Guardar contraseña"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        Para entrar usarás el código de firma <code className="rounded bg-slate-100 px-1">{info.tenantSlug}</code>
      </p>
    </AuthShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
