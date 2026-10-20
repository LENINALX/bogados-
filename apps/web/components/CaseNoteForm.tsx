"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Lock, NotebookPen } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { LIMITS, clean, rules } from "@/lib/validation";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

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
  const v = useFieldErrors<"body">(
    { body: [rules.required("Escribe el texto de la nota."), rules.maxLength(LIMITS.note)] },
    ["body"],
    () => "note-body",
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const text = clean(body);
    if (!v.submit({ body: text })) return;
    setLoading(true);
    setMessage(null);
    try {
      await nestFetch(`/cases/${caseId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: text, isInternal, ...(isInternal ? {} : { notifyClient }) }),
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
    <form onSubmit={onSubmit} noValidate className="card">
      <div className="card-header">
        <label htmlFor="note-body" className="card-title flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-slate-500" aria-hidden />
          Nueva nota
        </label>
        <div role="radiogroup" aria-label="Visibilidad de la nota" className="flex gap-0.5 rounded-lg bg-slate-900/[0.04] p-0.5">
          {(
            [
              [true, "Interna", Lock],
              [false, "Para el cliente", Eye],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={isInternal === value}
              onClick={() => setIsInternal(value)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ${
                isInternal === value
                  ? "bg-surface text-slate-900 shadow-[0_1px_2px_rgb(23_21_17/0.08)]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body space-y-3">
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            v.change("body", e.target.value);
            if (message?.type === "success") setMessage(null);
          }}
          rows={3}
          maxLength={LIMITS.note}
          required
          {...fieldA11y("note-body", v.errors.body, countId("note-body", body.length, LIMITS.note))}
          className={`input resize-y leading-relaxed ${v.errors.body ? INVALID_INPUT : ""}`}
          placeholder={isInternal ? "Escribe una nota para el equipo…" : "Cuéntale al cliente cómo avanza su caso…"}
        />
        {(v.errors.body || body.length >= LIMITS.note * 0.8) && (
          <div className="-mt-1.5 flex items-start justify-between gap-3">
            <FieldError id="note-body" error={v.errors.body} className="mt-0" />
            <CharCount id="note-body" length={body.length} max={LIMITS.note} className="ml-auto" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs text-slate-500">
              {isInternal
                ? "El cliente no la verá."
                : clientName
                  ? "El cliente la verá en su portal."
                  : "La verá el cliente cuando se le asigne uno al caso."}
            </p>
            {!isInternal && clientName && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={notifyClient}
                  onChange={(e) => setNotifyClient(e.target.checked)}
                />
                Avisar a <span className="font-medium text-slate-900">{clientName}</span> por email
              </label>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-sm">
            {loading && <Spinner className="h-3 w-3" />}
            {loading ? "Guardando…" : isInternal ? "Guardar nota" : "Publicar para el cliente"}
          </button>
        </div>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </div>
    </form>
  );
}
