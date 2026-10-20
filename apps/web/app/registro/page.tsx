"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { FormMessage, Spinner } from "@/components/ui";
import { clearNestToken, NEST_API_BASE } from "@/lib/nest-api";
import { rememberFirm } from "@/lib/firm-memory";
import { FIRM_SLUG, passwordStrength, slugifyFirm } from "@/lib/signup";
import { rules } from "@/lib/validation";
import { applyFilter, filters } from "@/lib/input-filters";


type SlugCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; suggestion?: string }
  | { state: "invalid" }
  | { state: "error" };

/** Comprueba en vivo si el código de firma está libre (y sugiere otro si no). */
function useSlugCheck(slug: string): SlugCheck {
  const [check, setCheck] = useState<SlugCheck>({ state: "idle" });
  const seq = useRef(0);
  useEffect(() => {
    const id = ++seq.current;
    if (!slug) return setCheck({ state: "idle" });
    if (!FIRM_SLUG.test(slug)) return setCheck({ state: "invalid" });
    setCheck({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${NEST_API_BASE}/auth/register-firm/slug?value=${encodeURIComponent(slug)}`);
        const json = await res.json();
        const data = (json.data ?? json) as { available: boolean; suggestion?: string };
        if (id !== seq.current) return;
        setCheck(data.available ? { state: "available" } : { state: "taken", suggestion: data.suggestion });
      } catch {
        if (id === seq.current) setCheck({ state: "error" });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug]);
  return check;
}

const STRENGTH_COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

export default function RegisterPage() {
  const router = useRouter();
  const [firmName, setFirmName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const check = useSlugCheck(slug);
  const strength = passwordStrength(password);

  // El código sigue al nombre hasta que la persona lo edita a mano
  useEffect(() => {
    if (!slugEdited) setSlug(slugifyFirm(firmName));
  }, [firmName, slugEdited]);

  const errors = {
    firmName: firmName.trim().length < 2 ? "Escribe el nombre de la firma." : null,
    slug:
      check.state === "invalid"
        ? "De 3 a 40 letras minúsculas, números o guiones."
        : check.state === "taken"
          ? "Ese código ya está en uso."
          : !slug
            ? "Elige un código para tu firma."
            : null,
    name: name.trim().length < 2 ? "Escribe tu nombre." : null,
    email: rules.required("Escribe tu email.")(email) ?? rules.email()(email),
    password: password.length < 8 ? "Al menos 8 caracteres." : null,
  };
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  function shake() {
    const form = formRef.current;
    if (!form) return;
    form.classList.remove("auth-shake");
    void form.offsetWidth;
    form.classList.add("auth-shake");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ firmName: true, slug: true, name: true, email: true, password: true });
    const firstInvalid = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);
    if (firstInvalid || check.state === "checking") {
      shake();
      if (firstInvalid) document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${NEST_API_BASE}/auth/register-firm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: firmName.trim(), slug, name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        shake();
        if (json.details?.code === "SLUG_TAKEN") {
          setSlugEdited(true);
          setTouched((t) => ({ ...t, slug: true }));
          setError(
            json.details.suggestion
              ? `El código «${slug}» acaba de ocuparse. Te proponemos «${json.details.suggestion}».`
              : json.error,
          );
          if (json.details.suggestion) setSlug(json.details.suggestion);
          return;
        }
        setError(
          res.status === 429
            ? "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo."
            : (json.error ?? "No pudimos crear la cuenta. Inténtalo de nuevo."),
        );
        return;
      }

      const firm = (json.data ?? json).firm as { name: string; slug: string };
      rememberFirm(firm);
      // Entrar directamente con la cuenta recién creada
      const login = await signIn("credentials", {
        email: email.trim(),
        password,
        tenantSlug: firm.slug,
        remember: "false",
        redirect: false,
      }).catch(() => null);
      clearNestToken();
      if (login && !login.error) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        router.replace(`/login?${new URLSearchParams({ firma: firm.slug, email: email.trim() })}`);
      }
    } catch {
      setLoading(false);
      shake();
      setError("No pudimos conectar con el servidor. Comprueba tu conexión o inténtalo en unos minutos.");
    }
  }

  const slugHint =
    check.state === "checking" ? (
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <Spinner className="h-3 w-3" /> Comprobando…
      </span>
    ) : check.state === "available" ? (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Disponible · tu equipo lo usará para entrar
      </span>
    ) : (
      "Tu equipo lo usará para entrar."
    );

  return (
    <AuthShell
      title="Crea tu despacho"
      subtitle="Tu firma, tu cuenta de administrador y los feriados de Ecuador listos en un minuto."
    >
      {error && (
        <div className="mb-5">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-7">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tu firma</legend>
          <AuthField
            id="firmName"
            label="Nombre de la firma"
            autoComplete="organization"
            autoFocus
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, firmName: true }))}
            placeholder="Nombre de la firma"
            maxLength={120}
            error={show("firmName")}
          />
          <AuthField
            id="slug"
            label="Código de firma"
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(applyFilter(e.target, filters.firmSlug));
            }}
            onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
            placeholder="codigo-de-tu-firma"
            maxLength={40}
            className="font-mono"
            error={(touched.slug || check.state === "taken") ? errors.slug : null}
            hint={<span aria-live="polite">{slugHint}</span>}
          />
          {check.state === "taken" && check.suggestion && (
            <button
              type="button"
              onClick={() => {
                setSlug(check.suggestion!);
                setSlugEdited(true);
              }}
              className="-mt-2 text-[13px] font-medium text-brand-700 hover:underline"
            >
              Usar «{check.suggestion}»
            </button>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Tu cuenta de administrador
          </legend>
          <AuthField
            id="name"
            label="Nombre y apellido"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Nombre"
            maxLength={120}
            error={show("name")}
          />
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(applyFilter(e.target, filters.email))}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="tu@firma.com"
            error={show("email")}
          />
          <AuthField
            id="password"
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            maxLength={72}
            error={show("password")}
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
                "Mínimo 8 caracteres. Mejor una frase larga que una palabra rara."
              )
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
        </fieldset>

        <div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Spinner />}
            {loading ? "Creando tu despacho…" : "Crear mi despacho"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Serás el administrador: podrás invitar a tu equipo y a tus clientes, y activar la verificación en dos pasos.
          </p>
        </div>
      </form>

      <p className="mt-6 border-t border-slate-900/[0.07] pt-5 text-[13px] text-slate-500">
        ¿Tu firma ya usa Bogados?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
