import { AlertCircle } from "lucide-react";

/**
 * Piezas de validación compartidas por los formularios de la app (los de acceso usan AuthField).
 * Un campo con error lleva aria-invalid y aria-describedby al mensaje: el lector de pantalla
 * lo lee al llegar al campo, y el foco va al primer campo con error al enviar.
 */

/** Clases que marcan en rojo un `.input` con error (mismas que PasswordInput). */
export const INVALID_INPUT = "border-red-300 focus:border-red-500 focus:ring-red-500/15";

/** Une los ids de ayuda/error/contador que describen un campo. */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const list = ids.filter(Boolean);
  return list.length ? list.join(" ") : undefined;
}

/** Atributos de accesibilidad de un campo según su error. */
export function fieldA11y(id: string, error: string | null | undefined, ...extra: (string | false | null | undefined)[]) {
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy(error && `${id}-error`, ...extra),
  };
}

/** Mensaje de error bajo un campo. Su id es `${fieldId}-error`. */
export function FieldError({ id, error, className = "" }: { id: string; error?: string | null; className?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className={`mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-red-700 ${className}`}>
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{error}</span>
    </p>
  );
}

/**
 * Contador de caracteres que aparece al acercarse al límite (desde el 80 % por defecto).
 * Su id es `${fieldId}-count`: inclúyelo en aria-describedby con `countId()`.
 */
export function CharCount({
  id,
  length,
  max,
  from = 0.8,
  className = "",
}: {
  id: string;
  length: number;
  max: number;
  from?: number;
  className?: string;
}) {
  if (length < max * from) return null;
  const left = max - length;
  return (
    <p
      id={`${id}-count`}
      className={`text-xs tabular-nums ${left <= 0 ? "font-medium text-red-700" : "text-amber-700"} ${className}`}
    >
      {length.toLocaleString("es-EC")} / {max.toLocaleString("es-EC")}
      <span className="sr-only">
        {left <= 0 ? " caracteres: has llegado al máximo" : ` caracteres: te quedan ${left.toLocaleString("es-EC")}`}
      </span>
    </p>
  );
}

/** Id del contador si está visible (para aria-describedby). */
export function countId(id: string, length: number, max: number, from = 0.8) {
  return length >= max * from ? `${id}-count` : undefined;
}
