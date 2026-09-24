"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";

export function CaseNoteForm({ caseId }: { caseId: string }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await nestFetch(`/cases/${caseId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body, isInternal }),
      });
      setBody("");
      router.refresh();
    } catch {
      setError("No se pudo guardar la nota. Inténtalo de nuevo.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800">Nueva nota</div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Avance o nota interna…"
      />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={isInternal}
          onChange={(e) => setIsInternal(e.target.checked)}
        />
        Nota interna (el cliente no la verá)
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        Guardar nota
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
