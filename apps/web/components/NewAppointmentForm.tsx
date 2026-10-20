"use client";

import { FormEvent, useState } from "react";
import { CalendarPlus, Plus, X } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { SlotPicker } from "./SlotPicker";
import { LIMITS, Schema, clean, rules } from "@/lib/validation";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type Option = { id: string; name: string };
type Field = "client" | "slot" | "manualAt" | "reason";

const ORDER: readonly Field[] = ["client", "slot", "manualAt", "reason"];
const IDS: Record<Field, string> = { client: "na-client", slot: "na-slot", manualAt: "na-at", reason: "na-reason" };

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
  const [reason, setReason] = useState("");
  const toast = useToast();

  const schema: Schema<Field> = {
    client: [rules.required("Elige el cliente de la cita.")],
    ...(manual
      ? {
          manualAt: [
            rules.required("Indica la fecha y hora de la cita."),
            rules.dateTime(),
            rules.future("La cita debe ser en el futuro: elige una fecha y hora posteriores a ahora."),
          ],
        }
      : { slot: [rules.required("Elige un horario libre.")] }),
    reason: [rules.maxLength(LIMITS.appointmentReason)],
  };
  const v = useFieldErrors<Field>(schema, ORDER, (k) => IDS[k]);
  const { errors } = v;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const manualAt = String(fd.get("manualAt") ?? "");
    const cleanReason = clean(reason);
    setMessage(null);
    if (!v.submit({ client: clientId, slot: startsAt ?? "", manualAt, reason: cleanReason })) return;
    const when = manual ? new Date(manualAt).toISOString() : startsAt;
    if (!when) return;
    setLoading(true);
    try {
      await nestFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          lawyerId,
          clientId,
          startsAt: when,
          durationMinutes: manual ? Number(fd.get("duration")) : undefined,
          caseId: String(fd.get("caseId") ?? "") || undefined,
          reason: cleanReason || undefined,
        }),
      });
      form.reset();
      setStartsAt(null);
      setClientId("");
      setReason("");
      v.reset();
      setReloadKey((k) => k + 1);
      toast("success", "Cita programada · el cliente recibirá un email");
      onCreated();
    } catch (err) {
      setReloadKey((k) => k + 1);
      const text = errorMessage(err, "No se pudo programar la cita.");
      if (manual && /en el futuro/i.test(text)) v.set("manualAt", text);
      else setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        <Plus className="h-4 w-4" aria-hidden />
        Programar cita
      </button>
    );
  }

  const clientCases = cases.filter((c) => c.clientId === clientId);

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-slate-500" aria-hidden />
          Programar cita
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost btn-sm -mr-1.5 h-7 w-7 p-0 text-slate-500"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4 px-4 py-4 sm:px-5">
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
            onChange={(e) => {
              setClientId(e.target.value);
              v.change("client", e.target.value);
            }}
            {...fieldA11y(IDS.client, errors.client)}
            className={`input mt-1 ${errors.client ? INVALID_INPUT : ""}`}
          >
            <option value="" disabled>Elige…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <FieldError id={IDS.client} error={errors.client} />
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

        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={manual}
            onChange={(e) => {
              setManual(e.target.checked);
              v.reset();
            }}
          />
          Otro horario (fuera de la disponibilidad)
        </label>
        {manual ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="na-at" className="label">Fecha y hora</label>
              <input
                id="na-at"
                name="manualAt"
                type="datetime-local"
                required
                onChange={(e) => v.change("manualAt", e.target.value)}
                onBlur={(e) => e.target.value && v.blur("manualAt", e.target.value)}
                {...fieldA11y(IDS.manualAt, errors.manualAt)}
                className={`input mt-1 ${errors.manualAt ? INVALID_INPUT : ""}`}
              />
            </div>
            <div>
              <label htmlFor="na-duration" className="label">Duración</label>
              <select id="na-duration" name="duration" defaultValue="60" className="input mt-1">
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <FieldError id={IDS.manualAt} error={errors.manualAt} className="col-span-2 mt-0" />
            <p className="col-span-2 text-xs text-slate-500">Hora de tu equipo.</p>
          </div>
        ) : (
          <div
            id={IDS.slot}
            tabIndex={-1}
            role="group"
            aria-label="Horario"
            {...fieldA11y(IDS.slot, errors.slot)}
            className="rounded-[10px] focus:outline-none"
          >
            <SlotPicker
              lawyerId={lawyerId}
              value={startsAt}
              onChange={(slot) => {
                setStartsAt(slot);
                v.change("slot", slot ?? "");
              }}
              reloadKey={reloadKey}
            />
            <FieldError id={IDS.slot} error={errors.slot} />
          </div>
        )}

        <div>
          <label htmlFor="na-reason" className="label">Motivo (opcional)</label>
          <input
            id="na-reason"
            name="reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              v.change("reason", e.target.value);
            }}
            maxLength={LIMITS.appointmentReason}
            {...fieldA11y(IDS.reason, errors.reason, countId(IDS.reason, reason.length, LIMITS.appointmentReason))}
            className={`input mt-1 ${errors.reason ? INVALID_INPUT : ""}`}
          />
          <FieldError id={IDS.reason} error={errors.reason} />
          <CharCount id={IDS.reason} length={reason.length} max={LIMITS.appointmentReason} className="mt-1 text-right" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? "Programando…" : "Programar cita"}
        </button>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </form>
    </section>
  );
}
