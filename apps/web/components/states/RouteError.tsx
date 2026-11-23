"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

/**
 * Error al cargar una página interna (los `error.tsx` de cada sección lo reexportan).
 * Mismo lenguaje que `ErrorState`: qué pasó, reintentar, y una salida segura.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // El foco va al título: el lector de pantalla anuncia el error en lugar de quedarse en silencio
    heading.current?.focus();
    console.error(error);
  }, [error]);

  return (
    <main className="page flex min-h-[70dvh] items-center justify-center">
      <div role="alert" className="card w-full max-w-md px-6 py-8 text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <CircleAlert className="h-5 w-5" aria-hidden />
        </span>
        <h1 ref={heading} tabIndex={-1} className="font-display text-[1.5rem] font-medium tracking-[-0.015em] text-slate-900 focus:outline-none">
          No se pudo cargar esta página
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Puede ser un problema de conexión o que el servidor no responda. Tus datos no se han perdido: inténtalo de
          nuevo en unos segundos.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            <RotateCw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
          <Link href="/" className="btn-secondary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
