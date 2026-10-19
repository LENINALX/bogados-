"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { SATJE_URL } from "@/lib/process-number";

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
    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <span>Proceso judicial:</span>
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] font-medium tracking-wide text-slate-800">
        {processNumber}
      </span>
      <button type="button" onClick={copyAndOpen} className="btn-ghost btn-sm text-brand-700">
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? "Copiado: pégalo en el SATJE" : "Consultar en SATJE"}
        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
      </button>
    </div>
  );
}