"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";
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

  async function submit() {
    if (!decision) return;
    setLoading(true);
    setError(null);
    try {
      await nestFetch(`/cases/${caseId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason: reason.trim() || undefined,
          lawyerId: decision === "aceptar" ? lawyerId : undefined,
        }),
      });
      toast("success", DONE_MESSAGE[decision]);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar la decisión."));
      setLoading(false);
    }
  }

  const options: Decision[] = postponed ? ["aceptar", "rechazar"] : ["aceptar", "aplazar", "rechazar"];

  return (
    <section className="card mb-6 border-amber-200 bg-amber-50/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        {postponed ? "Solicitud aplazada" : "Solicitud del cliente pendiente de decisión"}
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        El cliente recibirá un email con la decisión{decision === "rechazar" ? " y el motivo" : ""}.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDecision(d)}
            aria-pressed={decision === d}
            className={`btn-sm ${decision === d ? "btn-primary" : "btn-secondary"}`}
          >
            {LABEL[d]}
          </button>
        ))}
      </div>

      {decision && (
        <div className="mt-4 space-y-3">
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
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              required={decision === "rechazar"}
              className="input mt-1"
            />
          </div>
          {error && <FormMessage type="error">{error}</FormMessage>}
          <button
            type="button"
            disabled={loading || (decision === "rechazar" && reason.trim().length < 5)}
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
