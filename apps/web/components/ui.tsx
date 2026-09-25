import Link from "next/link";

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
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      <span aria-hidden className="font-bold">{isError ? "!" : "✓"}</span>
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
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
