"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";

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

  // Mantener visible el último mensaje
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    if (!body.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const message = await nestFetch<Msg>(`/cases/${caseId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <section className="card flex flex-col">
      <div className="card-header">
        <h2 className="card-title">Mensajes</h2>
        <span className="text-xs text-slate-400">{messages.length}</span>
      </div>
      <div ref={listRef} className="max-h-96 min-h-[10rem] space-y-3 overflow-y-auto bg-slate-50/60 p-4">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-slate-600">Aún no hay mensajes</p>
            <p className="mt-1 text-xs text-slate-400">Escribe abajo para iniciar la conversación.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender.id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  mine ? "rounded-br-sm bg-brand-700 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <div className={`mb-0.5 flex gap-2 text-[11px] ${mine ? "text-brand-100" : "text-slate-500"}`}>
                  <span className="font-semibold">{mine ? "Tú" : m.sender.name}</span>
                  <span>{new Date(m.createdAt).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={onSubmit} className="space-y-2 border-t border-slate-100 p-3">
        <div className="flex items-end gap-2">
          <label htmlFor={`msg-${caseId}`} className="sr-only">
            Escribe un mensaje
          </label>
          <textarea
            id={`msg-${caseId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribe un mensaje…"
            className="input max-h-32 min-h-[2.5rem] flex-1 resize-y"
          />
          <button type="submit" disabled={loading || !body.trim()} className="btn-primary">
            {loading && <Spinner />}
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </div>
        <p className="text-[11px] text-slate-400">Enter para enviar · Shift + Enter para salto de línea</p>
        {error && <FormMessage type="error">{error}</FormMessage>}
      </form>
    </section>
  );
}
