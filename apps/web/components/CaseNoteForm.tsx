"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";

export function CaseNoteForm({ caseId }: { caseId: string }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await nestFetch(`/cases/${caseId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body, isInternal }),
      });
      setBody("");
      setMessage({
        type: "success",
        text: isInternal ? "Nota interna guardada." : "Nota guardada y visible para el cliente.",
      });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "No se pudo guardar la nota. Inténtalo de nuevo.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <div className="card-header">
        <label htmlFor="note-body" className="card-title">
          Nueva nota
        </label>
      </div>
      <div className="card-body space-y-3">
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (message?.type === "success") setMessage(null);
          }}
          rows={3}
          className="input resize-y"
          placeholder="Escribe un avance o una nota interna…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            Nota interna
            <span className="text-xs text-slate-400">
              {isInternal ? "(el cliente no la verá)" : "(el cliente la verá en su portal)"}
            </span>
          </label>
          <button type="submit" disabled={loading || !body.trim()} className="btn-primary btn-sm">
            {loading && <Spinner className="h-3 w-3" />}
            {loading ? "Guardando…" : "Guardar nota"}
          </button>
        </div>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </div>
    </form>
  );
}
