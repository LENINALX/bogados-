import Link from "next/link";
import { AlertCircle, CheckCircle2, Inbox, LucideIcon } from "lucide-react";

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

export function EmptyState({
  title,
  hint,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  hint?: string;
  action?: { href: string; label: string };
  /** Icono del estado vacío (lucide); por defecto, una bandeja */
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-9 text-center">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600/[0.08] text-brand-700">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{hint}</p>}
      {action && (
        <Link href={action.href} className="btn-secondary btn-sm mt-3">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Mensaje legible a partir de un error de la API (o un texto por defecto). */
export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message && !/^Error API \d+$/.test(err.message)
    ? err.message
    : fallback;
}
