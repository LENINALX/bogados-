import { forwardRef } from "react";
import { AlertCircle, LucideIcon } from "lucide-react";

type Props = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** A la derecha de la etiqueta (p. ej. «¿La olvidaste?») */
  aside?: React.ReactNode;
  /** Dentro del campo, a la derecha (p. ej. mostrar la contraseña) */
  trailing?: React.ReactNode;
  /** Error del campo: lo marca en rojo y lo anuncia el lector de pantalla */
  error?: string | null;
  /** Ayuda o estado bajo el campo, cuando no hay error */
  hint?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

/** Campo de las pantallas de acceso: icono a la izquierda, que toma el color de la marca al enfocar. */
export const AuthField = forwardRef<HTMLInputElement, Props>(function AuthField(
  { id, label, icon: Icon, aside, trailing, error, hint, ...input },
  ref,
) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`input has-icon peer ${trailing ? "pr-12" : ""}`}
          {...input}
        />
        <Icon
          aria-hidden
          className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200 ${
            error ? "text-red-500" : "text-slate-400 peer-focus:text-brand-700"
          }`}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-1.5 text-[13px] text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
});
