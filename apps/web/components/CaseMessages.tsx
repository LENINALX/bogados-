"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";

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
  const [messages, setMessages] = useState(initial);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const message = await nestFetch<Msg>(`/cases/${caseId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((m) => [...m, message]);
      setBody("");
      router.refresh();
    } catch {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, { ...data.message, createdAt: data.message.createdAt }]);
        setBody("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">Mensajes</div>
      <div className="max-h-80 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">Sin mensajes aún</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.sender.id === currentUserId ? "bg-brand-50 ml-8" : "bg-slate-50 mr-8"
            }`}
          >
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">{m.sender.name}</span>
              <span>{new Date(m.createdAt).toLocaleString("es-EC")}</span>
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
