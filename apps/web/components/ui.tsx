import Link from "next/link";
import { AlertCircle, CheckCircle2, Inbox, LucideIcon, RotateCw, SearchX } from "lucide-react";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Mensaje de resultado de una acción. Los lectores de pantalla lo anuncian. */
export function FormMessage({
  type,
  children,
}: {
  type: "success" | "error";
  children: React.ReactNode;
}) {
  const isError = type === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-snug ${
        isError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-600" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      )}
      <span>{children}</span>
    </p>
  );
}

/**
 * Estados de un listado, iguales en toda la aplicación:
 * - cargando → `ListSkeleton` (o un esqueleto propio con la forma final)
 * - vacío → `EmptyState`
 * - búsqueda o filtros sin resultados → `NoResults`
 * - error al cargar → `ErrorState` (con «Reintentar»)
 */
export function EmptyState({
  title,
  hint,
  action,
  icon: Icon = Inbox,
  compact = false,
}: {
  title: string;
  hint?: string;
  /** Enlace (`href`) o botón (`onClick`) para salir del estado vacío */
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  /** Icono del estado vacío (lucide); por defecto, una bandeja */
  icon?: LucideIcon;
  /** Menos aire: dentro de menús y paneles pequeños */
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center px-4 text-center ${compact ? "py-6" : "py-9"}`}>
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600/[0.08] text-brand-700">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{hint}</p>}
      {action &&
        ("href" in action ? (
          <Link href={action.href} className="btn-secondary btn-sm mt-3">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="btn-secondary btn-sm mt-3">
            {action.label}
          </button>
        ))}
    </div>
  );
}

/** Búsqueda o filtros sin coincidencias: dice qué se buscó y cómo volver al listado completo. */
export function NoResults({
  query,
  title,
  hint = "Prueba con otras palabras o quita los filtros.",
  action,
  compact,
}: {
  /** Texto buscado (se muestra entre comillas en el título) */
  query?: string;
  title?: string;
  hint?: string;
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  compact?: boolean;
}) {
  return (
    <EmptyState
      icon={SearchX}
      title={title ?? (query ? `Sin resultados para «${query}»` : "Ningún resultado con estos filtros")}
      hint={hint}
      action={action}
      compact={compact}
    />
  );
}

/** Error al cargar datos: mensaje anunciado a lectores de pantalla y botón para reintentar. */
export function ErrorState({
  message,
  onRetry,
  retrying = false,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <FormMessage type="error">{message}</FormMessage>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="btn-secondary btn-sm">
          {retrying ? <Spinner className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" aria-hidden />}
          {retrying ? "Reintentando…" : "Reintentar"}
        </button>
      )}
    </div>
  );
}

/** Esqueleto genérico de un listado (filas con título y detalle), anunciado como «Cargando…». */
export function ListSkeleton({
  rows = 4,
  label = "Cargando…",
  className = "",
}: {
  rows?: number;
  /** Lo que oye el lector de pantalla mientras carga */
  label?: string;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={`space-y-2 ${className}`}>
      <p role="status" className="sr-only">
        {label}
      </p>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="flex items-center gap-3 rounded-[10px] px-1 py-2">
          <div className="skeleton h-8 w-8 shrink-0 rounded-[10px]" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-3.5" style={{ width: `${70 - ((i * 13) % 30)}%` }} />
            <div className="skeleton mt-2 h-3" style={{ width: `${45 - ((i * 7) % 15)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mensaje legible a partir de un error de la API (o un texto por defecto). */
export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message && !/^Error API \d+$/.test(err.message)
    ? err.message
    : fallback;
}
