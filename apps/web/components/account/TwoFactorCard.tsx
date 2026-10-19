"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mail, ShieldCheck, ShieldOff } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";
import { PasswordInput } from "./PasswordInput";

type Props = {
  /** Preferencia personal guardada en la cuenta */
  enabled: boolean;
  /** La firma la exige a su equipo: siempre se pide el código y no se puede desactivar */
  requiredByFirm: boolean;
  onChange: (enabled: boolean) => void;
};

/** Verificación en dos pasos: estado y activar/desactivar confirmando con la contraseña actual. */
export function TwoFactorCard({ enabled, requiredByFirm, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Lo que de verdad ocurre al entrar: la exigencia de la firma manda sobre la preferencia */
  const active = enabled || requiredByFirm;
  const target = !enabled;
  const canToggle = !requiredByFirm;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setPassword("");
    setFieldError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setFieldError("Escribe tu contraseña actual.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setFieldError(null);
    setMessage(null);
    try {
      const res = await nestFetch<{ twoFactorEnabled: boolean }>("/auth/two-factor", {
        method: "PATCH",
        body: JSON.stringify({ enabled: target, password }),
      });
      onChange(res.twoFactorEnabled);
      close();
      setMessage({
        type: "success",
        text: res.twoFactorEnabled
          ? "Verificación en dos pasos activada. La próxima vez que entres te pediremos un código."
          : "Verificación en dos pasos desactivada. Entrarás solo con tu contraseña.",
      });
    } catch (err) {
      const text = errorMessage(err, "No se pudo guardar el cambio. Inténtalo de nuevo.");
      if (/contraseña/i.test(text)) {
        setFieldError(text);
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        setMessage({ type: "error", text });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="two-factor-title">
      <div className="card-header">
        <h2 id="two-factor-title" className="card-title flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden />
          Verificación en dos pasos
        </h2>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {active ? "Activada" : "Desactivada"}
        </span>
      </div>

      <div className="card-body space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          Al entrar, además de tu contraseña, te pediremos un código de 6 dígitos que enviamos a tu email. Así, aunque
          alguien conozca tu contraseña, no podrá acceder sin tu correo.
        </p>

        {requiredByFirm && (
          <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Tu firma exige la verificación en dos pasos a todo el equipo, así que siempre te pediremos el código y no
              puedes desactivarla.
            </span>
          </p>
        )}

        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

        {canToggle && !open && (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setOpen(true);
            }}
            className={target ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
          >
            {target ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <ShieldOff className="h-4 w-4" aria-hidden />}
            {target ? "Activar" : "Desactivar"}
          </button>
        )}

        {canToggle && open && (
          <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <p className="text-sm text-slate-700">
              {target
                ? "Para activarla, confirma que eres tú con tu contraseña actual."
                : "Para desactivarla, confirma que eres tú con tu contraseña actual. Tu cuenta quedará protegida solo por la contraseña."}
            </p>
            <PasswordInput
              ref={inputRef}
              id="two-factor-password"
              label="Contraseña actual"
              autoComplete="current-password"
              maxLength={72}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              error={fieldError}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn-primary btn-sm">
                {busy && <Spinner className="h-3.5 w-3.5" />}
                {busy ? "Guardando…" : target ? "Activar verificación" : "Desactivar verificación"}
              </button>
              <button type="button" onClick={close} disabled={busy} className="btn-ghost btn-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
