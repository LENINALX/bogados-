"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { Spinner, errorMessage } from "./ui";

type SaveState = "idle" | "saving" | "saved" | "error";

const MESSAGE_MAX = 1000;

export function CaseStatusForm({
  caseId,
  status,
  clientName = null,
}: {
  caseId: string;
  status: string;
  /** Si el caso tiene cliente, el cambio se confirma y se le puede avisar por email. */
  clientName?: string | null;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  // Estado elegido pendiente de confirmar (solo con cliente)
  const [pending, setPending] = useState<string | null>(null);
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientMessage, setClientMessage] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [savedWithEmail, setSavedWithEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextStatus: string) {
    const previousStatus = status;
    const withEmail = Boolean(clientName) && notifyClient;
    setSelectedStatus(nextStatus);
    setState("saving");
    setError(null);
    try {
      await nestFetch(`/cases/${caseId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          ...(clientName ? { notifyClient, clientMessage: clientMessage.trim() || undefined } : {}),
        }),
      });
      setPending(null);
      setClientMessage("");
      setNotifyClient(true);
      setSavedWithEmail(withEmail);
      setState("saved");
      router.refresh();
    } catch (err) {
      setSelectedStatus(previousStatus);
      setState("error");
      setError(errorMessage(err, "No se pudo cambiar el estado. Inténtalo de nuevo."));
    }
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (!clientName) {
      void save(next);
      return;
    }
    setSelectedStatus(next);
    setError(null);
    setState("idle");
    setPending(next === status ? null : next);
  }

  function cancel() {
    setPending(null);
    setSelectedStatus(status);
    setError(null);
    setState("idle");
  }

  useEffect(() => setSelectedStatus(status), [status]);

  // Escape cancela aunque el foco siga en el selector
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // El "Guardado" desaparece solo tras unos segundos
  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 3500);
    return () => clearTimeout(t);
  }, [state]);

  const pendingLabel = pending ? CASE_STATUS_LABELS[pending as CaseStatus] : "";

  return (
    <div className="relative flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={`status-${caseId}`} className="text-xs font-medium text-slate-500">
          Cambiar estado
        </label>
        <select
          id={`status-${caseId}`}
          value={selectedStatus}
          onChange={onChange}
          disabled={state === "saving"}
          className="input w-auto py-1.5"
        >
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CASE_STATUS_LABELS[s as CaseStatus]}
            </option>
          ))}
        </select>
      </div>

      {pending && clientName && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(pending);
          }}
          aria-label={`Confirmar cambio a ${pendingLabel}`}
          // Desplegable anclado al selector: no empuja la cabecera del caso
          className="absolute left-0 top-full z-30 sm:left-auto sm:right-0 mt-1 w-[min(20rem,calc(100vw-2rem))] space-y-3 rounded-xl border border-slate-200 bg-surface p-3 text-left shadow-lg"
        >
          <p className="text-sm font-medium text-slate-800">
            Pasar a «{pendingLabel}»
          </p>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
            />
            <span>
              Avisar a <span className="font-medium">{clientName}</span> por email
            </span>
          </label>
          <div>
            <label htmlFor={`status-msg-${caseId}`} className="block text-xs font-medium text-slate-600">
              Explicación para el cliente <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id={`status-msg-${caseId}`}
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              rows={3}
              maxLength={MESSAGE_MAX}
              className="input mt-1 resize-y text-sm"
              placeholder="Con tus palabras: qué significa este cambio y qué viene después…"
            />
            <p className="mt-1 text-xs text-slate-400">
              {notifyClient ? "La verá en su portal y en el email." : "La verá en su portal."}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} disabled={state === "saving"} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={state === "saving"} className="btn-primary btn-sm">
              {state === "saving" && <Spinner className="h-3 w-3" />}
              {state === "saving" ? "Guardando…" : notifyClient ? "Cambiar y avisar" : "Cambiar estado"}
            </button>
          </div>
        </form>
      )}

      <p className="min-h-4 max-w-xs text-right text-xs" role={state === "error" ? "alert" : "status"}>
        {state === "saving" && !pending && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Spinner className="h-3 w-3" /> Guardando…
          </span>
        )}
        {state === "saved" && (
          <span className="text-emerald-700">
            ✓ Estado actualizado{savedWithEmail ? " y cliente avisado por email" : ""}
          </span>
        )}
        {state === "error" && <span className="text-red-600">{error}</span>}
      </p>
    </div>
  );
}
