"use client";

import { forwardRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

type Props = {
  id: string;
  label: string;
  /** Error del campo: lo marca en rojo y lo anuncia el lector de pantalla */
  error?: string | null;
  /** Ayuda bajo el campo cuando no hay error */
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "id">;

/** Campo de contraseña con botón para mostrarla u ocultarla y mensaje de error asociado. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { id, label, error, hint, className = "", ...input },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={false}
          autoCapitalize="off"
          className={`input pr-11 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-500/15" : ""}`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
