"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearNestToken, NestApiError, nestLogin } from "@/lib/nest-api";
import { FormMessage, Spinner } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Nest JWT (fuente de verdad API) + NextAuth (sesión SSR)
      await nestLogin(email, password);
    } catch (error) {
      setLoading(false);
      setError(
        error instanceof NestApiError && error.status === 401
          ? "El email o la contraseña no son correctos. Revísalos e inténtalo de nuevo."
          : "No pudimos conectar con el servidor. Comprueba tu conexión o inténtalo en unos minutos.",
      );
      return;
    }
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      clearNestToken();
      setError("El email o la contraseña no son correctos. Revísalos e inténtalo de nuevo.");
      return;
    }
    // Se mantiene el indicador de carga mientras se navega
    router.push("/");
    router.refresh();
  }

  const forbidden = params.get("error") === "forbidden";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white shadow-sm">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Bogados</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión legal para tu firma</p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold text-slate-800">Inicia sesión</h2>

          {(forbidden || error) && (
            <div className="mb-4">
              <FormMessage type="error">
                {error || "No tienes permiso para entrar en esa sección. Inicia sesión con otra cuenta."}
              </FormMessage>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
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
            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
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
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-center text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Cuentas de demo:</span> admin@demo.bogados ·
          abogado@demo.bogados · cliente@demo.bogados
          <br />
          Contraseña: <code className="rounded bg-slate-100 px-1">demo1234</code>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
