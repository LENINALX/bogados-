"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NestApiError, nestPublicFetch } from "@/lib/nest-api";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage, Spinner } from "@/components/ui";

function RecoverForm() {
  const params = useSearchParams();
  const [tenantSlug, setTenantSlug] = useState(params.get("firma") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await nestPublicFetch("/auth/forgot-password", { tenantSlug, email });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof NestApiError && err.status === 429
          ? "Demasiados intentos con esta cuenta. Espera 15 minutos e inténtalo de nuevo."
          : "No pudimos conectar con el servidor. Inténtalo en unos minutos.",
      );
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/login?${new URLSearchParams({ firma: tenantSlug, email }).toString()}`;

  if (sent) {
    return (
      <AuthShell title="Revisa tu correo">
        {/* Mismo mensaje exista o no la cuenta: no revela qué emails están registrados */}
        <p className="text-sm leading-relaxed text-slate-600">
          Si <span className="font-medium text-slate-800">{email}</span> tiene una cuenta en la firma{" "}
          <span className="font-medium text-slate-800">{tenantSlug}</span>, te enviamos un enlace para
          restablecer la contraseña. Caduca en 1 hora.
        </p>
        <p className="mt-3 text-xs text-slate-500">¿No llega? Revisa la carpeta de spam.</p>
        <Link href={loginHref} className="btn-secondary mt-6 w-full justify-center">
          Volver a iniciar sesión
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar contraseña">
      <p className="mb-4 text-sm text-slate-600">
        Te enviaremos por email un enlace para elegir una contraseña nueva.
      </p>
      {error && (
        <div className="mb-4">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="tenantSlug" className="label">
            Código de firma
          </label>
          <input
            id="tenantSlug"
            required
            autoComplete="organization"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="input mt-1"
            placeholder="firma-demo"
          />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            placeholder="tu@firma.com"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading && <Spinner />}
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href={loginHref} className="font-medium text-brand-700 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RecoverPage() {
  return (
    <Suspense>
      <RecoverForm />
    </Suspense>
  );
}
