"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useRef, useState, Suspense } from "react";
import { ArrowRight, Building2, Eye, EyeOff, Lock, LucideIcon, Mail } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  /** Sacudida breve del formulario al fallar: el error se siente además de leerse */
  function shake() {
    const form = formRef.current;
    if (!form) return;
    form.classList.remove("auth-shake");
    void form.offsetWidth; // reinicia la animación si ya se había aplicado
    form.classList.add("auth-shake");
  }

  function fillDemo(demoEmail: string) {
    setTenantSlug("firma-demo");
    setEmail(demoEmail);
    setPassword("demo1234");
    setError(null);
    submitRef.current?.focus();
  }

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
      shake();
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
      title="Bienvenido de nuevo"
      subtitle="Entra en el despacho de tu firma."
      footer={<DemoAccounts onPick={fillDemo} />}
    >
      {(paramError || error) && (
        <div className="mb-5">
          <FormMessage type="error">{error || paramError}</FormMessage>
        </div>
      )}
      {passwordSaved && !error && (
        <div className="mb-5">
          <FormMessage type="success">Contraseña guardada. Ya puedes iniciar sesión.</FormMessage>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <Field
          id="tenantSlug"
          label="Código de firma"
          icon={Building2}
          type="text"
          required
          autoComplete="organization"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          placeholder="firma-demo"
        />
        <Field
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          required
          autoFocus={!prefilled}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@firma.com"
        />
        <Field
          id="password"
          label="Contraseña"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          required
          autoFocus={prefilled}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aside={
            <Link href={recoverHref} className="text-[13px] font-medium text-brand-700 hover:underline">
              ¿La olvidaste?
            </Link>
          }
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar la contraseña" : "Mostrar la contraseña"}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          }
        />
        <button type="submit" ref={submitRef} disabled={loading} className="btn-primary group mt-2 w-full">
          {loading && <Spinner />}
          {loading ? "Entrando…" : "Iniciar sesión"}
          {!loading && <ArrowRight className="cta-arrow h-4 w-4" aria-hidden />}
        </button>
      </form>
    </AuthShell>
  );
}

/** Campo con icono a la izquierda; el icono toma el color de la marca al enfocar. */
function Field({
  id,
  label,
  icon: Icon,
  aside,
  trailing,
  ...input
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  aside?: React.ReactNode;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input id={id} className={`input has-icon peer ${trailing ? "pr-12" : ""}`} {...input} />
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors duration-200 peer-focus:text-brand-700"
        />
        {trailing}
      </div>
    </div>
  );
}

const DEMO = [
  { role: "Admin", email: "admin@demo.bogados" },
  { role: "Abogado", email: "abogado@demo.bogados" },
  { role: "Cliente", email: "cliente@demo.bogados" },
];

/** Cuentas de la firma de demostración: un clic rellena el formulario. */
function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  return (
    <div className="shell-capsule mt-4 rounded-[22px] p-4">
      <p className="text-[13px] font-medium text-slate-600">Probar con una cuenta de demostración</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {DEMO.map((d) => (
          <button
            key={d.role}
            type="button"
            onClick={() => onPick(d.email)}
            className="btn rounded-xl border border-slate-900/[0.08] bg-surface px-2 py-2 text-[13px] font-medium text-slate-700 hover:border-slate-900/20"
          >
            {d.role}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-center text-xs text-slate-400">
        Firma <code className="font-mono text-slate-500">firma-demo</code> · contraseña{" "}
        <code className="font-mono text-slate-500">demo1234</code>
      </p>
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
