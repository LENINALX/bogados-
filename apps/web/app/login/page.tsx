"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearNestToken } from "@/lib/nest-api";
import { TOO_MANY_ATTEMPTS } from "@/lib/auth-errors";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage, Spinner } from "@/components/ui";

const PARAM_ERRORS: Record<string, string> = {
  forbidden: "No tienes permiso para entrar en esa sección. Inicia sesión con otra cuenta.",
  expired: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  revoked: "Tu cuenta está desactivada. Contacta con el administrador de tu firma.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // /restablecer redirige aquí con ?firma=&email= para no tener que reescribirlos
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState(params.get("firma") ?? "firma-demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // NextAuth valida contra la API Nest y guarda su JWT en la sesión
    const res = await signIn("credentials", {
      email,
      password,
      tenantSlug,
      redirect: false,
    }).catch(() => null);
    if (!res || res.error) {
      setLoading(false);
      setError(
        res?.error === "CredentialsSignin"
          ? "El código de firma, el email o la contraseña no son correctos. Revísalos e inténtalo de nuevo."
          : res?.error === TOO_MANY_ATTEMPTS
            ? "Demasiados intentos con esta cuenta. Espera 15 minutos e inténtalo de nuevo."
            : "No pudimos conectar con el servidor. Comprueba tu conexión o inténtalo en unos minutos.",
      );
      return;
    }
    clearNestToken(); // descartar un token en caché de una sesión anterior
    // Se mantiene el indicador de carga mientras se navega
    router.push("/");
    router.refresh();
  }

  const paramError = PARAM_ERRORS[params.get("error") ?? ""];
  const passwordSaved = params.get("ok") === "password";
  const prefilled = Boolean(params.get("email"));
  const recoverHref = `/recuperar?${new URLSearchParams({ firma: tenantSlug, email }).toString()}`;

  return (
    <AuthShell
      title="Inicia sesión"
      footer={
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-center text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Firma demo:</span> código `firma-demo` ·
          <br />
          <span className="font-semibold text-slate-600">Cuentas:</span> admin@demo.bogados ·
          abogado@demo.bogados · cliente@demo.bogados
          <br />
          Contraseña: <code className="rounded bg-slate-100 px-1">demo1234</code>
        </div>
      }
    >
      {(paramError || error) && (
        <div className="mb-4">
          <FormMessage type="error">{error || paramError}</FormMessage>
        </div>
      )}
      {passwordSaved && !error && (
        <div className="mb-4">
          <FormMessage type="success">Contraseña guardada. Ya puedes iniciar sesión.</FormMessage>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="tenantSlug" className="label">
            Código de firma
          </label>
          <input
            id="tenantSlug"
            type="text"
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
            autoFocus={!prefilled}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            placeholder="tu@firma.com"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">
              Contraseña
            </label>
            <Link href={recoverHref} className="text-xs font-medium text-brand-700 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoFocus={prefilled}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading && <Spinner />}
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
