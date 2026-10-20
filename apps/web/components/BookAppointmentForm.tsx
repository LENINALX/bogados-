"use client";

import { FormEvent, useEffect, useState } from "react";
import { nestFetch } from "@/lib/nest-api";
import { SlotPicker } from "./SlotPicker";
import { CalendarOff } from "lucide-react";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";
import { LIMITS, Schema, clean, rules } from "@/lib/validation";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type Option = { id: string; name: string };
type Field = "lawyer" | "slot" | "reason";

const IDS: Record<Field, string> = { lawyer: "lawyerId", slot: "book-slot", reason: "reason" };
/** Sin abogado elegido aún no se ven los horarios: solo se pide el abogado */
const schemaFor = (hasLawyer: boolean): Schema<Field> => ({
  lawyer: [rules.required("Elige con qué abogado quieres la cita.")],
  ...(hasLawyer ? { slot: [rules.required("Elige el día y la hora de la cita.")] } : {}),
  reason: [rules.maxLength(LIMITS.appointmentReason)],
});

/** El cliente pide una cita: abogado → hueco libre → motivo. Queda pendiente de confirmar. */
export function BookAppointmentForm({
  cases,
  onBooked,
}: {
  cases: { id: string; title: string }[];
  onBooked: () => void;
}) {
  const [lawyers, setLawyers] = useState<Option[] | null>(null);
  const [lawyerId, setLawyerId] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const toast = useToast();
  const v = useFieldErrors<Field>(schemaFor(!!lawyerId), ["lawyer", "slot", "reason"], (k) => IDS[k]);
  const { errors } = v;

  useEffect(() => {
    nestFetch<Option[]>("/appointments/lawyers")
      .then((list) => {
        setLawyers(list);
        if (list.length === 1) setLawyerId(list[0].id);
      })
      .catch((err) => setMessage({ type: "error", text: errorMessage(err, "No se pudieron cargar los abogados.") }));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const cleanReason = clean(reason);
    setMessage(null);
    if (!v.submit({ lawyer: lawyerId, slot: startsAt ?? "", reason: cleanReason }) || !startsAt) return;
    setLoading(true);
    try {
      await nestFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          lawyerId,
          startsAt,
          reason: cleanReason || undefined,
          caseId: String(fd.get("caseId") ?? "") || undefined,
        }),
      });
      form.reset();
      setStartsAt(null);
      setReason("");
      v.reset();
      setReloadKey((k) => k + 1);
      toast("success", "Cita solicitada · te avisaremos cuando la confirmen");
      onBooked();
    } catch (err) {
      // 409: alguien reservó ese hueco a la vez → recargar los horarios
      setReloadKey((k) => k + 1);
      setMessage({ type: "error", text: errorMessage(err, "No se pudo pedir la cita.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" aria-labelledby="book-title">
      <div className="border-b border-slate-900/[0.06] px-4 py-4 sm:px-5">
        <h2 id="book-title" className="font-display text-[1.25rem] font-medium tracking-[-0.015em] text-slate-900">
          Pedir una cita
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
          Elige el día y la hora. La cita queda pendiente hasta que el despacho la confirme.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5 px-4 py-5 sm:px-5">
        {lawyers && lawyers.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="Aún no hay horarios de atención"
            hint="Cuando el despacho publique sus horarios podrás pedir una cita aquí."
          />
        ) : (
          <>
            <div>
              <label htmlFor="lawyerId" className="label">Abogado</label>
              <select
                id="lawyerId"
                required
                value={lawyerId}
                onChange={(e) => {
                  setLawyerId(e.target.value);
                  v.change("lawyer", e.target.value);
                }}
                {...fieldA11y(IDS.lawyer, errors.lawyer)}
                className={`input mt-1.5 ${errors.lawyer ? INVALID_INPUT : ""}`}
              >
                <option value="" disabled>{lawyers ? "Elige un abogado" : "Cargando…"}</option>
                {lawyers?.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <FieldError id={IDS.lawyer} error={errors.lawyer} />
            </div>

            {lawyerId && (
              <div
                id={IDS.slot}
                tabIndex={-1}
                role="group"
                aria-labelledby={`${IDS.slot}-label`}
                {...fieldA11y(IDS.slot, errors.slot)}
                className="rounded-[10px] focus:outline-none"
              >
                <span id={`${IDS.slot}-label`} className="label mb-1.5">Día y hora</span>
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

            {cases.length > 0 && (
              <div>
                <label htmlFor="caseId" className="label">
                  Caso <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <select id="caseId" name="caseId" defaultValue="" className="input mt-1.5">
                  <option value="">Consulta general</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="reason" className="label">
                Motivo <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={2}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  v.change("reason", e.target.value);
                }}
                maxLength={LIMITS.appointmentReason}
                {...fieldA11y(IDS.reason, errors.reason, countId(IDS.reason, reason.length, LIMITS.appointmentReason))}
                className={`input mt-1.5 ${errors.reason ? INVALID_INPUT : ""}`}
                placeholder="Ej. Revisar el contrato antes de firmarlo"
              />
              <FieldError id={IDS.reason} error={errors.reason} />
              <CharCount id={IDS.reason} length={reason.length} max={LIMITS.appointmentReason} className="mt-1 text-right" />
            </div>

            <div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading && <Spinner />}
                {loading ? "Enviando…" : "Pedir cita"}
              </button>
              {!startsAt && !loading && !errors.slot && !errors.lawyer && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  {lawyerId ? "Elige una hora para continuar." : "Elige un abogado para ver sus horarios."}
                </p>
              )}
            </div>
          </>
        )}
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </form>
    </section>
  );
}
