"use client";

import Link from "next/link";
import { FormEvent, Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NestApiError, nestPublicFetch } from "@/lib/nest-api";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { FormMessage, Spinner } from "@/components/ui";
import { normalizeFirmSlug } from "@/lib/firm-memory";
import { clean, firstError, LIMITS, rules, validate } from "@/lib/validation";
import { applyFilter, filters } from "@/lib/input-filters";

const TENANT_SLUG = /^[a-z0-9-]{2,60}$/;

function RecoverForm() {
  const params = useSearchParams();
  const [tenantSlug, setTenantSlug] = useState(params.get("firma") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ tenantSlug?: boolean; email?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const slugRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const errors = validate(
    { tenantSlug: normalizeFirmSlug(tenantSlug), email: clean(email) },
    {
      tenantSlug: [
        rules.required("Escribe el código de tu firma."),
        rules.pattern(TENANT_SLUG, "El código solo lleva minúsculas, números y guiones."),
      ],
      email: [rules.required("Escribe tu email."), rules.email()],
    },
  );
  const shown = (f: "tenantSlug" | "email") => (submitted || touched[f] ? errors[f] ?? null : null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setSubmitted(true);
    const invalid = firstError(errors, ["tenantSlug", "email"] as const);
    if (invalid) {
      (invalid === "tenantSlug" ? slugRef : emailRef).current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await nestPublicFetch("/auth/forgot-password", {
        tenantSlug: normalizeFirmSlug(tenantSlug),
        email: clean(email).toLowerCase(),
      });
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
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos por email un enlace para elegir una contraseña nueva.">
      {error && (
        <div className="mb-4">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <AuthField
          ref={slugRef}
          id="tenantSlug"
          label="Código de firma"
          autoComplete="organization"
          autoCapitalize="none"
          spellCheck={false}
          value={tenantSlug}
          onChange={(e) => setTenantSlug(applyFilter(e.target, filters.firmSlug))}
          onBlur={() => setTouched((t) => ({ ...t, tenantSlug: true }))}
          maxLength={60}
          placeholder="codigo-de-tu-firma"
          error={shown("tenantSlug")}
        />
        <AuthField
          ref={emailRef}
          id="email"
          label="Email"
          type="email"
          autoFocus
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(applyFilter(e.target, filters.email))}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          maxLength={LIMITS.email}
          placeholder="tu@firma.com"
          error={shown("email")}
        />
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
