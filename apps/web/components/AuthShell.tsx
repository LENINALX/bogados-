import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "./shell/BrandMark";

/** Marco de las pantallas sin sesión: login, recuperar y restablecer contraseña. */
export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Halo de marca muy suave detrás de la tarjeta (estático) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[32rem] w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-100 to-transparent opacity-70 blur-3xl"
      />
      <div className="w-full max-w-[25rem] animate-enter">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <BrandMark />
          <p className="text-sm text-slate-500">Gestión legal para tu firma</p>
        </div>

        <div className="card p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <h1 className="mb-5 text-xl font-semibold tracking-[-0.02em] text-slate-900">{title}</h1>
          {children}
        </div>

        {footer}

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Volver a la página principal
          </Link>
        </p>
      </div>
    </div>
  );
}
