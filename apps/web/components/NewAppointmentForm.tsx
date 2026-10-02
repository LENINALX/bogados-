"use client";

import { FormEvent, useState } from "react";
import { nestFetch } from "@/lib/nest-api";
import { SlotPicker } from "./SlotPicker";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";

type Option = { id: string; name: string };

/**
 * El despacho programa una cita (queda confirmada). Puede elegir un hueco libre
 * o, fuera de la disponibilidad, un horario manual.
 */
export function NewAppointmentForm({
  currentUserId,
  lawyers,
  clients,
  cases,
  onCreated,
}: {
  currentUserId: string;
  /** Solo admin: puede programar en la agenda de otros */
  lawyers: Option[] | null;
  clients: Option[];
  cases: { id: string; title: string; clientId: string | null }[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lawyerId, setLawyerId] = useState(currentUserId);
  const [clientId, setClientId] = useState("");
  const [manual, setManual] = useState(false);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toast = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const when = manual ? new Date(String(fd.get("manualAt"))).toISOString() : startsAt;
    if (!when) return;
    setLoading(true);
    setMessage(null);
    try {
      await nestFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          lawyerId,
          clientId,
          startsAt: when,
          durationMinutes: manual ? Number(fd.get("duration")) : undefined,
          caseId: String(fd.get("caseId") ?? "") || undefined,
          reason: String(fd.get("reason") ?? "").trim() || undefined,
        }),
      });
      form.reset();
      setStartsAt(null);
      setClientId("");
      setReloadKey((k) => k + 1);
      toast("success", "Cita programada · el cliente recibirá un email");
      onCreated();
    } catch (err) {
      setReloadKey((k) => k + 1);
      setMessage({ type: "error", text: errorMessage(err, "No se pudo programar la cita.") });
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        + Programar cita
      </button>
    );
  }

  const clientCases = cases.filter((c) => c.clientId === clientId);

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">Programar cita</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-800">
          Cerrar
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 px-4 py-4 sm:px-5">
        {lawyers && (
          <div>
            <label htmlFor="na-lawyer" className="label">Abogado</label>
            <select id="na-lawyer" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)} className="input mt-1">
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="na-client" className="label">Cliente</label>
          <select
            id="na-client"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input mt-1"
          >
            <option value="" disabled>Elige…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {clients.length === 0 && <p className="mt-1 text-xs text-slate-500">No hay clientes activos.</p>}
        </div>

        {clientCases.length > 0 && (
          <div>
            <label htmlFor="na-case" className="label">Caso (opcional)</label>
            <select id="na-case" name="caseId" defaultValue="" className="input mt-1">
              <option value="">Sin caso</option>
              {clientCases.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          Otro horario (fuera de la disponibilidad)
        </label>
        {manual ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="na-at" className="label">Fecha y hora</label>
              <input id="na-at" name="manualAt" type="datetime-local" required className="input mt-1" />
            </div>
            <div>
              <label htmlFor="na-duration" className="label">Duración</label>
              <select id="na-duration" name="duration" defaultValue="60" className="input mt-1">
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <p className="col-span-2 text-xs text-slate-500">Hora de tu equipo.</p>
          </div>
        ) : (
          <SlotPicker lawyerId={lawyerId} value={startsAt} onChange={setStartsAt} reloadKey={reloadKey} />
        )}

        <div>
          <label htmlFor="na-reason" className="label">Motivo (opcional)</label>
          <input id="na-reason" name="reason" maxLength={500} className="input mt-1" />
        </div>

        <button type="submit" disabled={loading || !clientId || (!manual && !startsAt)} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? "Programando…" : "Programar cita"}
        </button>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </form>
    </section>
  );
}
