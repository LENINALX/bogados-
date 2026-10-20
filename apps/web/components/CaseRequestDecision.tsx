"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { LIMITS, Rule, clean, rules } from "@/lib/validation";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";
import { useToast } from "./Toaster";

type Decision = "aceptar" | "aplazar" | "rechazar";

const DONE_MESSAGE: Record<Decision, string> = {
  aceptar: "Caso aceptado · el cliente recibirá un email",
  aplazar: "Solicitud aplazada",
  rechazar: "Solicitud rechazada",
};

const LABEL: Record<Decision, string> = {
  aceptar: "Aceptar caso",
  aplazar: "Aplazar",
  rechazar: "Rechazar",
};

/** Panel del admin para decidir una solicitud del portal. */
export function CaseRequestDecision({
  caseId,
  postponed,
  staff,
  currentUserId,
}: {
  caseId: string;
  /** Ya se aplazó antes (sigue abierta) */
  postponed: boolean;
  staff: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [lawyerId, setLawyerId] = useState(currentUserId);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const reasonRules: Rule[] =
    decision === "rechazar"
      ? [
          rules.required("Explica al cliente el motivo del rechazo."),
          rules.minLength(LIMITS.rejectReason, `Escribe un motivo de al menos ${LIMITS.rejectReason} caracteres.`),
          rules.maxLength(LIMITS.decisionReason),
        ]
      : [rules.maxLength(LIMITS.decisionReason)];
  const v = useFieldErrors<"reason">({ reason: reasonRules }, ["reason"], () => "decision-reason");

  async function submit() {
    if (!decision || loading) return;
    const text = clean(reason);
    setError(null);
    if (!v.submit({ reason: text })) return;
    setLoading(true);
    try {
      await nestFetch(`/cases/${caseId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason: text || undefined,
          lawyerId: decision === "aceptar" ? lawyerId : undefined,
        }),
      });
      toast("success", DONE_MESSAGE[decision]);
      router.refresh();
    } catch (err) {
      const text = errorMessage(err, "No se pudo guardar la decisión.");
      setLoading(false);
      if (/motivo del rechazo/i.test(text)) v.set("reason", text);
      else setError(text);
    }
  }

  const options: Decision[] = postponed ? ["aceptar", "rechazar"] : ["aceptar", "aplazar", "rechazar"];

  return (
    <section className="card mb-6 border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-100 text-amber-800" aria-hidden>
          <Inbox className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="card-title">
            {postponed ? "Solicitud aplazada" : "Solicitud del cliente pendiente de decisión"}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-600">
            El cliente recibirá un email con la decisión{decision === "rechazar" ? " y el motivo" : ""}.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:pl-12">
        {options.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setDecision(d);
              v.reset();
            }}
            aria-pressed={decision === d}
            className={`btn-sm ${decision === d ? "btn-primary" : "btn-secondary"}`}
          >
            {LABEL[d]}
          </button>
        ))}
      </div>

      {decision && (
        <div className="mt-4 space-y-3 sm:pl-12">
          {decision === "aceptar" && (
            <div>
              <label htmlFor="decision-lawyer" className="label">Abogado responsable</label>
              <select
                id="decision-lawyer"
                value={lawyerId}
                onChange={(e) => setLawyerId(e.target.value)}
                className="input mt-1 sm:max-w-xs"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="decision-reason" className="label">
              {decision === "rechazar" ? "Motivo (obligatorio, lo verá el cliente)" : "Comentario para el cliente (opcional)"}
            </label>
            <textarea
              id="decision-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                v.change("reason", clean(e.target.value));
              }}
              onBlur={(e) => e.target.value && v.blur("reason", clean(e.target.value))}
              rows={3}
              maxLength={LIMITS.decisionReason}
              required={decision === "rechazar"}
              {...fieldA11y(
                "decision-reason",
                v.errors.reason,
                countId("decision-reason", reason.length, LIMITS.decisionReason),
              )}
              className={`input mt-1 ${v.errors.reason ? INVALID_INPUT : ""}`}
            />
            <FieldError id="decision-reason" error={v.errors.reason} />
            <CharCount
              id="decision-reason"
              length={reason.length}
              max={LIMITS.decisionReason}
              className="mt-1 text-right"
            />
          </div>
          {error && <FormMessage type="error">{error}</FormMessage>}
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="btn-primary"
          >
            {loading && <Spinner />}
            Confirmar: {LABEL[decision].toLowerCase()}
          </button>
        </div>
      )}
    </section>
  );
}
