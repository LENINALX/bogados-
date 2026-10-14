"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";

export function CaseNoteForm({
  caseId,
  clientName = null,
}: {
  caseId: string;
  /** Cliente del caso: una nota visible se le notifica y, si se marca, por email. */
  clientName?: string | null;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [notifyClient, setNotifyClient] = useState(true);
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
        body: JSON.stringify({ body, isInternal, ...(isInternal ? {} : { notifyClient }) }),
      });
      setBody("");
      setMessage({
        type: "success",
        text: isInternal
          ? "Nota interna guardada."
          : clientName && notifyClient
            ? `Nota publicada en el portal y aviso enviado por email a ${clientName}.`
            : "Nota guardada y visible para el cliente.",
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
          maxLength={5000}
          required
          className="input resize-y"
          placeholder="Escribe un avance o una nota interna…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Nota interna
              <span className="text-xs text-slate-400">
                {isInternal
                  ? "(el cliente no la verá)"
                  : clientName
                    ? "(el cliente la verá en su portal)"
                    : "(visible para el cliente cuando se asigne uno)"}
              </span>
            </label>
            {!isInternal && clientName && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={notifyClient} onChange={(e) => setNotifyClient(e.target.checked)} />
                Avisar a <span className="font-medium text-slate-700">{clientName}</span> por email
              </label>
            )}
          </div>
          <button type="submit" disabled={loading || !body.trim()} className="btn-primary btn-sm">
            {loading && <Spinner className="h-3 w-3" />}
            {loading ? "Guardando…" : isInternal ? "Guardar nota" : "Publicar para el cliente"}
          </button>
        </div>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </div>
    </form>
  );
}
