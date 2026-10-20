"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { SATJE_URL } from "@/lib/process-number";

/**
 * Número del proceso judicial con acceso a la consulta pública del SATJE.
 * La consulta no admite enlaces directos a un proceso: copiamos el número y abrimos la página.
 */
export function ProcessNumberLink({ processNumber }: { processNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function copyAndOpen() {
    try {
      await navigator.clipboard.writeText(processNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // La consulta se abre aunque el navegador no permita usar el portapapeles.
    }
    window.open(SATJE_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="break-all text-[0.9375rem] font-semibold tracking-[0.02em] text-slate-900 tabular-nums">
          {processNumber}
        </span>
        <button type="button" onClick={copyAndOpen} className="btn-secondary btn-sm">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          )}
          Consultar en SATJE
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </button>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500" aria-live="polite">
        {copied
          ? "Número copiado. Pégalo en la consulta de procesos del SATJE."
          : "Copiamos el número y abrimos la consulta pública de la Función Judicial."}
      </p>
    </div>
  );
}
