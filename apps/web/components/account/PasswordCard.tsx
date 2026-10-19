"use client";

import { FormEvent, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";
import { PasswordInput } from "./PasswordInput";

const MIN = 8;
const MAX = 72;

type Field = "current" | "next" | "confirm";
type Errors = Partial<Record<Field, string>>;

function validate(current: string, next: string, confirm: string): Errors {
  const errors: Errors = {};
  if (!current) errors.current = "Escribe tu contraseña actual.";
  if (!next) errors.next = "Escribe la nueva contraseña.";
  else if (next.length < MIN) errors.next = `Debe tener al menos ${MIN} caracteres.`;
  else if (next.length > MAX) errors.next = `Debe tener como máximo ${MAX} caracteres.`;
  else if (current && next === current) errors.next = "Debe ser distinta de la actual.";
  if (!confirm) errors.confirm = "Repite la nueva contraseña.";
  else if (next && confirm !== next) errors.confirm = "Las contraseñas no coinciden.";
  return errors;
}

/** Cambio de contraseña. La API invalida todas las sesiones, así que al terminar se vuelve al login. */
export function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const refs = {
    current: useRef<HTMLInputElement>(null),
    next: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };

  function showErrors(found: Errors) {
    setErrors(found);
    const first = (["current", "next", "confirm"] as const).find((f) => found[f]);
    if (first) refs[first].current?.focus();
  }

  function clearError(field: Field) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validate(current, next, confirm);
    if (Object.keys(found).length) return showErrors(found);

    setBusy(true);
    try {
      await nestFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setDone(true);
      // El token actual ya no vale: salir antes de que otra llamada a la API lo descubra.
      await signOut({ callbackUrl: "/login?ok=password-changed" });
    } catch (err) {
      const text = errorMessage(err, "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      if (/actual no es correcta/i.test(text)) showErrors({ current: text });
      else if (/distinta de la actual/i.test(text)) showErrors({ next: text });
      else setFormError(text);
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="password-title">
      <div className="card-header">
        <h2 id="password-title" className="card-title flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-500" aria-hidden />
          Contraseña
        </h2>
      </div>

      <form onSubmit={submit} noValidate className="card-body space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <LogOut className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Al cambiarla cerraremos todas tus sesiones abiertas, incluida esta. Tendrás que volver a entrar con la nueva
            contraseña en cada dispositivo.
          </span>
        </p>

        <PasswordInput
          ref={refs.current}
          id="current-password"
          label="Contraseña actual"
          autoComplete="current-password"
          maxLength={MAX}
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            clearError("current");
          }}
          error={errors.current}
          disabled={done}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            ref={refs.next}
            id="new-password"
            label="Nueva contraseña"
            autoComplete="new-password"
            maxLength={MAX}
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              clearError("next");
            }}
            error={errors.next}
            hint={`Entre ${MIN} y ${MAX} caracteres.`}
            disabled={done}
          />
          <PasswordInput
            ref={refs.confirm}
            id="confirm-password"
            label="Repite la nueva contraseña"
            autoComplete="new-password"
            maxLength={MAX}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clearError("confirm");
            }}
            error={errors.confirm}
            disabled={done}
          />
        </div>

        {formError && <FormMessage type="error">{formError}</FormMessage>}
        {done && <FormMessage type="success">Contraseña cambiada. Cerrando la sesión…</FormMessage>}

        <button type="submit" disabled={busy || done} className="btn-primary w-full sm:w-auto">
          {busy && <Spinner className="h-4 w-4" />}
          {busy ? "Cambiando…" : "Cambiar contraseña y cerrar sesiones"}
        </button>
      </form>
    </section>
  );
}
