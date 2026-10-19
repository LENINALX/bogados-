"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearNestToken } from "@/lib/nest-api";
import { decodeLoginOutcome, LoginChallenge, loginOutcomeMessage } from "@/lib/auth-errors";
import { normalizeFirmSlug, readRememberedFirm, RememberedFirm, rememberFirm } from "@/lib/firm-memory";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { FirmChip, FirmCodeField, useFirmLookup } from "@/components/auth/FirmPicker";
import { LoginCodeStep } from "@/components/auth/LoginCodeStep";
import { FormMessage, Spinner } from "@/components/ui";

const PARAM_MESSAGES: Record<string, { type: "error" | "success"; text: string }> = {
  forbidden: { type: "error", text: "No tienes permiso para entrar en esa sección. Inicia sesión con otra cuenta." },
  expired: { type: "error", text: "Tu sesión ha caducado. Vuelve a iniciar sesión." },
  revoked: { type: "error", text: "Tu cuenta está desactivada. Contacta con el administrador de tu firma." },
};
const OK_MESSAGES: Record<string, string> = {
  password: "Contraseña guardada. Ya puedes iniciar sesión.",
  "password-changed": "Contraseña cambiada. Por seguridad cerramos tus sesiones: entra con la nueva.",
  "signed-out": "Has cerrado la sesión.",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Las cuentas de demostración solo se ofrecen en desarrollo o en una instalación de demo. */
const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const firmParam = params.get("firma");

  // /restablecer y los enlaces de invitación llegan con ?firma=&email=
  const [remembered, setRemembered] = useState<RememberedFirm | null>(null);
  const [editingFirm, setEditingFirm] = useState(Boolean(firmParam));
  const [tenantSlug, setTenantSlug] = useState(firmParam ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const firmRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // La firma recordada se lee en el navegador (no existe en el servidor)
  useEffect(() => {
    if (firmParam) return;
    const firm = readRememberedFirm();
    if (firm) {
      setRemembered(firm);
      setTenantSlug(firm.slug);
    } else {
      setEditingFirm(true);
    }
  }, [firmParam]);

  const useChip = Boolean(remembered && !editingFirm && normalizeFirmSlug(tenantSlug) === remembered.slug);
  const lookup = useFirmLookup(tenantSlug, !useChip);
  const firmName = useChip ? remembered!.name : lookup.state === "found" ? lookup.name : null;
  const emailError = emailTouched && email && !EMAIL.test(email.trim()) ? "Escribe un email válido, como nombre@firma.com." : null;

  function shake() {
    const form = formRef.current;
    if (!form) return;
    form.classList.remove("auth-shake");
    void form.offsetWidth; // reinicia la animación si ya se había aplicado
    form.classList.add("auth-shake");
  }

  function fillDemo(demoEmail: string) {
    setEditingFirm(true);
    setTenantSlug("firma-demo");
    setEmail(demoEmail);
    setPassword("demo1234");
    setError(null);
    submitRef.current?.focus();
  }

  const finish = useCallback(() => {
    const slug = normalizeFirmSlug(tenantSlug);
    if (firmName) rememberFirm({ slug, name: firmName });
    clearNestToken(); // descartar un token en caché de una sesión anterior
    router.replace(safeCallbackPath(params.get("callbackUrl"), window.location.origin));
    router.refresh();
  }, [firmName, params, router, tenantSlug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    // Errores que se ven sin preguntar al servidor: se señala el campo y se pone el foco en él
    if (lookup.state === "missing") {
      shake();
      firmRef.current?.focus();
      return;
    }
    if (!EMAIL.test(email.trim())) {
      shake();
      emailRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    // NextAuth valida contra la API Nest y guarda su JWT en la sesión
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      tenantSlug: normalizeFirmSlug(tenantSlug),
      remember: String(remember),
      redirect: false,
    }).catch(() => null);

    if (res && !res.error) {
      finish(); // se mantiene «Entrando…» mientras se navega
      return;
    }
    setLoading(false);
    const outcome = decodeLoginOutcome(res?.error);
    if (outcome.kind === "two_factor") {
      setChallenge(outcome.challenge);
      return;
    }
    shake();
    setError(loginOutcomeMessage(outcome));
    if (outcome.kind === "invalid") {
      setPassword("");
      passwordRef.current?.focus();
    }
  }

  const verifyCode = useCallback(
    async (challengeId: string, code: string) => {
      const res = await signIn("credentials", { challengeId, code, redirect: false }).catch(() => null);
      if (res && !res.error) {
        finish();
        return null;
      }
      const outcome = decodeLoginOutcome(res?.error);
      return { message: loginOutcomeMessage(outcome), restart: outcome.kind === "restart" || outcome.kind === "locked" };
    },
    [finish],
  );

  const restart = useCallback((message?: string) => {
    setChallenge(null);
    setPassword("");
    setError(message ?? null);
    setTimeout(() => passwordRef.current?.focus(), 0);
  }, []);

  const paramMessage = PARAM_MESSAGES[params.get("error") ?? ""];
  const okMessage = OK_MESSAGES[params.get("ok") ?? ""];
  const recoverHref = `/recuperar?${new URLSearchParams({ firma: normalizeFirmSlug(tenantSlug), email }).toString()}`;

  if (challenge) {
    return (
      <AuthShell
        title="Verifica que eres tú"
        subtitle="Tu cuenta pide un código además de la contraseña."
      >
        <LoginCodeStep challenge={challenge} onVerify={verifyCode} onRestart={restart} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle={firmName ? `Entra en ${firmName}.` : "Entra en el despacho de tu firma."}
      footer={SHOW_DEMO ? <DemoAccounts onPick={fillDemo} /> : undefined}
    >
      {(error || (paramMessage && !okMessage)) && (
        <div className="mb-5">
          <FormMessage type="error">{error || paramMessage.text}</FormMessage>
        </div>
      )}
      {okMessage && !error && (
        <div className="mb-5">
          <FormMessage type="success">{okMessage}</FormMessage>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
        {useChip ? (
          <FirmChip
            name={remembered!.name}
            slug={remembered!.slug}
            onChange={() => {
              setEditingFirm(true);
              setTimeout(() => firmRef.current?.select(), 0);
            }}
          />
        ) : (
          <FirmCodeField ref={firmRef} value={tenantSlug} onChange={setTenantSlug} lookup={lookup} autoFocus={!firmParam && !params.get("email")} />
        )}
        <AuthField
          ref={emailRef}
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          required
          autoFocus={useChip && !email}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          placeholder="tu@firma.com"
          error={emailError}
        />
        <AuthField
          ref={passwordRef}
          id="password"
          label="Contraseña"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          required
          autoFocus={Boolean(params.get("email"))}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          onBlur={() => setCapsLock(false)}
          hint={
            capsLock ? (
              <span className="font-medium text-amber-700" role="status">
                Bloq Mayús está activado
              </span>
            ) : undefined
          }
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl py-1">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[rgb(var(--brand-600))]"
          />
          <span className="leading-tight">
            <span className="block text-sm font-medium text-slate-700">Mantener la sesión iniciada</span>
            <span className="mt-0.5 block text-xs text-slate-500">30 días en este dispositivo. No en ordenadores compartidos.</span>
          </span>
        </label>

        <button type="submit" ref={submitRef} disabled={loading} className="btn-primary group mt-1 w-full">
          {loading && <Spinner />}
          {loading ? "Entrando…" : "Iniciar sesión"}
          {!loading && <ArrowRight className="cta-arrow h-4 w-4" aria-hidden />}
        </button>
      </form>

      <div className="mt-6 space-y-2 border-t border-slate-900/[0.06] pt-5 text-[13px] text-slate-500">
        <p>¿Primera vez? Usa el enlace del correo de invitación de tu firma.</p>
        <p className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700/70" aria-hidden />
          Datos aislados por firma · verificación en dos pasos
        </p>
      </div>
    </AuthShell>
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
