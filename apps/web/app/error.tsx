"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600" aria-hidden>
        !
      </div>
      <h1 className="text-lg font-semibold text-slate-800">No se pudo cargar esta página</h1>
      <p className="mt-2 text-sm text-slate-500">
        Puede ser un problema de conexión o que el servidor no esté disponible. Inténtalo de nuevo
        en unos segundos.
      </p>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Reintentar
        </button>
        <Link href="/" className="btn-secondary">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
