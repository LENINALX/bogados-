"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Gavel, Pencil } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { PROCESS_NUMBER_EXAMPLE, SATJE_URL, isValidProcessNumber, normalizeProcessNumber } from "@/lib/process-number";

/**
 * Número de proceso del SATJE en la ficha del caso. El despacho lo vincula o corrige;
 * «Copiar y abrir el SATJE» copia el número y abre la consulta pública en otra pestaña
 * (la consulta no admite enlaces directos a un proceso: hay que pegarlo).
 */
export function ProcessNumberField({ caseId, processNumber }: { caseId: string; processNumber: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(processNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const next = normalizeProcessNumber(value);
    if (next && !isValidProcessNumber(next)) {
      setError(`Usa el formato del SATJE, por ejemplo ${PROCESS_NUMBER_EXAMPLE}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await nestFetch(`/cases/${caseId}`, { method: "PATCH", body: JSON.stringify({ processNumber: next }) });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el número de proceso.");
    } finally {
      setSaving(false);
    }
  }

  async function copyAndOpen() {
    if (!processNumber) return;
    try {
      await navigator.clipboard.writeText(processNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso de portapapeles: se abre igualmente la consulta
    }
    window.open(SATJE_URL, "_blank", "noopener,noreferrer");
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="processNumber" className="sr-only">
            Número de proceso
          </label>
          <input
            id="processNumber"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={PROCESS_NUMBER_EXAMPLE}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby="processNumber-help"
            className="input font-mono tracking-wide sm:max-w-xs"
          />
          <p id="processNumber-help" className={`mt-1 text-xs ${error ? "text-red-700" : "text-slate-500"}`}>
            {error ?? "Judicatura - año - secuencial, tal como aparece en el SATJE. Déjalo vacío para desvincularlo."}
          </p>
        </div>
        <button type="submit" disabled={saving} className="btn-primary btn-sm py-2">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(processNumber ?? "");
            setError(null);
          }}
          className="btn-ghost btn-sm py-2"
        >
          Cancelar
        </button>
      </form>
    );
  }

  if (!processNumber) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="btn-secondary btn-sm">
        <Gavel className="h-3.5 w-3.5" aria-hidden />
        Vincular número de proceso
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-slate-500">Proceso:</span>
      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[13px] font-medium tracking-wide text-slate-900">
        {processNumber}
      </span>
      <button type="button" onClick={copyAndOpen} className="btn-ghost btn-sm text-brand-700">
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? "Copiado: pégalo en el SATJE" : "Copiar y abrir el SATJE"}
        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-ghost btn-sm h-7 w-7 p-0 text-slate-500"
        aria-label="Editar número de proceso"
        title="Editar número de proceso"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
