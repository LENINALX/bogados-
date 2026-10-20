import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

/**
 * Piezas pequeñas compartidas por las pantallas del despacho (y algunas del portal):
 * insignias, filtros y cabeceras de tabla con el mismo acabado. Los estados vacíos usan EmptyState (ui.tsx).
 */

export type Tone = "brand" | "emerald" | "amber" | "red" | "sky" | "slate";

/** Fondo tintado + color del icono para cada tono (los tokens cambian solos en oscuro). */
export const TONE_SOFT: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200/70",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  red: "bg-red-50 text-red-700 ring-red-200/70",
  sky: "bg-sky-50 text-sky-700 ring-sky-200/70",
  slate: "bg-slate-100 text-slate-600 ring-slate-900/[0.06]",
};

/** Insignia de estado: rectángulo suave, 11 px, fondo tintado del color semántico. */
export const BADGE_TONE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  sky: "bg-sky-100 text-sky-800",
  slate: "bg-slate-100 text-slate-600",
};

export function Badge({
  tone = "slate",
  icon: Icon,
  children,
  className = "",
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${BADGE_TONE[tone]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

/** Filtro en forma de pastilla (enlaces o botones). */
export function chipClass(active: boolean) {
  return `inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-[background-color,border-color,color] duration-150 ${
    active
      ? "border-slate-900/[0.12] bg-surface text-slate-900 shadow-[0_1px_2px_rgb(23_21_17/0.06)]"
      : "border-transparent text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
  }`;
}

/** Contador dentro de un filtro */
export function ChipCount({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`text-xs tabular-nums ${active ? "text-slate-500" : "text-slate-400"}`}>{children}</span>
  );
}

/** Contenedor de filtros: un carril hundido donde la opción activa se eleva. */
export const chipRail = "inline-flex flex-wrap items-center gap-0.5 rounded-[10px] bg-slate-900/[0.04] p-0.5";

/** Cabecera de tabla: mayúsculas pequeñas (único sitio donde se usan). */
export const th = "px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 sm:px-5";

/** Fila de tabla densa */
export const tr = "transition-colors duration-150 hover:bg-slate-900/[0.02]";

/** Título de sección en serif (dentro de una página) */
export function SectionTitle({
  id,
  children,
  as: Tag = "h2",
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      id={id}
      className={`font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-slate-900 ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Tono de la insignia de cada estado de cita (mismo criterio que STATUS_BADGE). */
export const APPOINTMENT_TONE: Record<"pendiente" | "confirmada" | "completada" | "cancelada", Tone> = {
  pendiente: "amber",
  confirmada: "emerald",
  completada: "sky",
  cancelada: "slate",
};

/** Enlace secundario de cabecera de tarjeta («Ver agenda», «Ver todos») con flecha que avanza al pasar. */
export function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md text-[13px] font-medium text-brand-700 underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRight className="cta-arrow h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}
