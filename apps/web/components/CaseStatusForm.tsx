"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { LIMITS, clean, rules } from "@/lib/validation";
import { Spinner, errorMessage } from "./ui";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type SaveState = "idle" | "saving" | "saved" | "error";

const MESSAGE_MAX = LIMITS.clientMessage;

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
  const msgId = `status-msg-${caseId}`;
  const v = useFieldErrors<"clientMessage">(
    { clientMessage: [rules.maxLength(MESSAGE_MAX)] },
    ["clientMessage"],
    () => msgId,
  );

  async function save(nextStatus: string) {
    if (state === "saving") return;
    const message = clean(clientMessage);
    if (clientName && !v.submit({ clientMessage: message })) return;
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
          ...(clientName ? { notifyClient, clientMessage: message || undefined } : {}),
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
    <div className="relative flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-2">
        <label htmlFor={`status-${caseId}`} className="text-xs text-slate-500">
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
          noValidate
          aria-label={`Confirmar cambio a ${pendingLabel}`}
          // Desplegable anclado al selector: no empuja la cabecera del caso
          className="absolute left-0 top-full z-30 mt-1.5 w-[min(20rem,calc(100vw-2rem))] origin-top space-y-3 rounded-xl border border-slate-900/[0.1] bg-surface p-3.5 text-left shadow-[0_1px_2px_rgb(23_21_17/0.06),0_16px_40px_-12px_rgb(23_21_17/0.28)] motion-safe:animate-pop sm:left-auto sm:right-0"
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
            <label htmlFor={msgId} className="block text-xs font-medium text-slate-600">
              Explicación para el cliente <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id={msgId}
              value={clientMessage}
              onChange={(e) => {
                setClientMessage(e.target.value);
                v.change("clientMessage", e.target.value);
              }}
              rows={3}
              maxLength={MESSAGE_MAX}
              {...fieldA11y(msgId, v.errors.clientMessage, countId(msgId, clientMessage.length, MESSAGE_MAX), `${msgId}-hint`)}
              className={`input mt-1 resize-y text-sm ${v.errors.clientMessage ? INVALID_INPUT : ""}`}
              placeholder="Con tus palabras: qué significa este cambio y qué viene después…"
            />
            <FieldError id={msgId} error={v.errors.clientMessage} />
            <div className="mt-1 flex items-start justify-between gap-3">
              <p id={`${msgId}-hint`} className="text-xs text-slate-400">
                {notifyClient ? "La verá en su portal y en el email." : "La verá en su portal."}
              </p>
              <CharCount id={msgId} length={clientMessage.length} max={MESSAGE_MAX} />
            </div>
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

      <p className="min-h-4 max-w-xs text-xs sm:text-right" role={state === "error" ? "alert" : "status"}>
        {state === "saving" && !pending && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Spinner className="h-3 w-3" /> Guardando…
          </span>
        )}
        {state === "saved" && (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Estado actualizado{savedWithEmail ? " y cliente avisado por email" : ""}
          </span>
        )}
        {state === "error" && <span className="text-red-600">{error}</span>}
      </p>
    </div>
  );
}
