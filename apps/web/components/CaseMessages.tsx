"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { MessagesSquare, SendHorizontal } from "lucide-react";
import { LIMITS, clean, rules } from "@/lib/validation";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

export function CaseMessages({
  caseId,
  initial,
  currentUserId,
}: {
  caseId: string;
  initial: Msg[];
  currentUserId: string;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState(initial);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const inputId = `msg-${caseId}`;
  const v = useFieldErrors<"body">(
    { body: [rules.required("Escribe el mensaje antes de enviarlo."), rules.maxLength(LIMITS.message)] },
    ["body"],
    () => inputId,
  );

  // Mantener visible el último mensaje
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    if (loading) return;
    const text = clean(body);
    if (!v.submit({ body: text })) return;
    setLoading(true);
    setError(null);
    try {
      const message = await nestFetch<Msg>(`/cases/${caseId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      setMessages((m) => [...m, message]);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo enviar el mensaje. Tu texto sigue en el cuadro; inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  // Enter envía, Shift+Enter hace salto de línea
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      // Enter con el cuadro vacío no hace nada (ni muestra error); el botón sí avisa
      if (clean(body)) send();
    }
  }

  return (
    <section className="card flex flex-col overflow-hidden">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-slate-500" aria-hidden />
          Mensajes
        </h2>
        <span className="text-xs tabular-nums text-slate-500">{messages.length}</span>
      </div>
      <div
        ref={listRef}
        className="max-h-96 min-h-[10rem] space-y-3 overflow-y-auto bg-slate-900/[0.02] px-4 py-4 sm:px-5"
      >
        {messages.length === 0 && (
          <EmptyState
            icon={MessagesSquare}
            title="Aún no hay mensajes"
            hint="Escribe abajo para iniciar la conversación. Cada mensaje queda en el caso."
          />
        )}
        {messages.map((m) => {
          const mine = m.sender.id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${mine ? "items-end text-right" : "items-start"} flex flex-col`}>
                <div className="mb-1 flex gap-2 px-1 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">{mine ? "Tú" : m.sender.name}</span>
                  <time dateTime={m.createdAt} className="tabular-nums">
                    {new Date(m.createdAt).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}
                  </time>
                </div>
                <p
                  className={`whitespace-pre-wrap break-words rounded-[14px] px-3.5 py-2 text-left text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-[4px] bg-brand-600 text-white"
                      : "rounded-bl-[4px] border border-slate-900/[0.08] bg-surface text-slate-800 shadow-[0_1px_1px_rgb(23_21_17/0.04)]"
                  }`}
                >
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-2 border-t border-slate-900/[0.06] px-4 py-3 sm:px-5">
        <div className="flex items-end gap-2">
          <label htmlFor={inputId} className="sr-only">
            Escribe un mensaje
          </label>
          <textarea
            id={inputId}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              v.change("body", e.target.value);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={LIMITS.message}
            placeholder="Escribe un mensaje…"
            {...fieldA11y(inputId, v.errors.body, countId(inputId, body.length, LIMITS.message), `${inputId}-keys`)}
            className={`input max-h-32 min-h-[2.5rem] flex-1 resize-y ${v.errors.body ? INVALID_INPUT : ""}`}
          />
          <button type="submit" disabled={loading} className="btn-primary h-10">
            {loading ? <Spinner /> : <SendHorizontal className="h-4 w-4" aria-hidden />}
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </div>
        <FieldError id={inputId} error={v.errors.body} className="mt-0" />
        <div className="flex items-start justify-between gap-3">
          <p id={`${inputId}-keys`} className="text-[11px] text-slate-400">
            Enter para enviar · Shift + Enter para salto de línea
          </p>
          <CharCount id={inputId} length={body.length} max={LIMITS.message} className="text-[11px]" />
        </div>
        {error && <FormMessage type="error">{error}</FormMessage>}
      </form>
    </section>
  );
}
