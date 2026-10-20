"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { nestPublicFetch } from "@/lib/nest-api";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";
import { passwordStrength } from "@/lib/signup";
import { firstError, LIMITS, rules, validate } from "@/lib/validation";

const STRENGTH_COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

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
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState<{ password?: boolean; confirm?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const strength = passwordStrength(password);

  const errors = validate(
    { password, confirm },
    {
      password: [rules.newPassword()],
      confirm: [rules.required("Repite la contraseña."), rules.matches(() => password)],
    },
  );
  const shown = (f: "password" | "confirm") => (submitted || touched[f] ? errors[f] ?? null : null);

  // Validar el enlace antes de pedir la contraseña: un enlace caducado se detecta al abrirlo
  useEffect(() => {
    // Un enlace real trae un token de 43 caracteres; nada parecido no se consulta
    if (!token || token.length < 20 || token.length > 200) {
      setInvalid(token ? "El enlace no es válido o ha caducado." : "Falta el enlace. Ábrelo desde el email que recibiste.");
      return;
    }
    nestPublicFetch<TokenInfo>(`/auth/token-info?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((err) => setInvalid(errorMessage(err, "El enlace no es válido o ha caducado.")));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setSubmitted(true);
    const invalidField = firstError(errors, ["password", "confirm"] as const);
    if (invalidField) {
      (invalidField === "password" ? passwordRef : confirmRef).current?.focus();
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
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Oculto: ayuda al gestor de contraseñas a asociarla a la cuenta correcta */}
        <input type="email" name="username" autoComplete="username" value={info.email} readOnly hidden />
        <AuthField
          ref={passwordRef}
          id="password"
          label="Contraseña"
          type={show ? "text" : "password"}
          autoFocus
          maxLength={LIMITS.password.max}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={shown("password")}
          hint={
            password ? (
              <span className="flex items-center gap-2.5" aria-live="polite">
                <span className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                        strength.score >= i ? STRENGTH_COLORS[strength.score] : "bg-slate-900/[0.08]"
                      }`}
                    />
                  ))}
                </span>
                <span className="shrink-0 text-xs">{strength.label}</span>
              </span>
            ) : (
              `Mínimo ${LIMITS.password.min} caracteres. Mejor una frase larga que una palabra rara.`
            )
          }
          trailing={
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
              aria-label={show ? "Ocultar la contraseña" : "Mostrar la contraseña"}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-700"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          }
        />
        <AuthField
          ref={confirmRef}
          id="confirm"
          label="Repite la contraseña"
          type={show ? "text" : "password"}
          maxLength={LIMITS.password.max}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={shown("confirm")}
        />
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
