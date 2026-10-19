"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  // Al volver del paso del código, el formulario entra por la izquierda (por donde se fue)
  const [cameBack, setCameBack] = useState(false);
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
    setCameBack(true);
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
        step="forward"
      >
        <LoginCodeStep challenge={challenge} onVerify={verifyCode} onRestart={restart} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={firmName ? `Accede a ${firmName}.` : "Accede al despacho de tu firma."}
      step={cameBack ? "back" : "enter"}
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
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          }
        />

        <label className="flex cursor-pointer items-center gap-2.5 pt-1" title="30 días en este dispositivo. No lo marques en un ordenador compartido.">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            aria-describedby="remember-hint"
            className="h-4 w-4 rounded border-slate-300 accent-[rgb(var(--brand-600))]"
          />
          <span className="text-sm text-slate-700">Mantener la sesión iniciada</span>
          <span id="remember-hint" className="text-xs text-slate-400">· 30 días</span>
        </label>

        <button type="submit" ref={submitRef} disabled={loading} className="btn-primary mt-2 w-full">
          {loading && <Spinner />}
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-6 text-[13px] leading-relaxed text-slate-500">
        ¿Primera vez? Activa tu cuenta con el enlace del correo de invitación de tu firma.
      </p>
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
    <div className="mt-8">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-900/[0.08]" />
        Entorno de demostración
        <span className="h-px flex-1 bg-slate-900/[0.08]" />
      </div>
      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[0.625rem] border border-slate-900/[0.12] bg-surface text-[13px] font-medium text-slate-700">
        {DEMO.map((d, i) => (
          <button
            key={d.role}
            type="button"
            onClick={() => onPick(d.email)}
            className={`py-2.5 transition-colors hover:bg-slate-900/[0.04] active:bg-slate-900/[0.07] ${i > 0 ? "border-l border-slate-900/[0.1]" : ""}`}
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
