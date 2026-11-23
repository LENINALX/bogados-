"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { nestDownloadFile, nestFetch } from "@/lib/nest-api";
import { SlotPicker } from "./SlotPicker";
import { CalendarCheck2, CalendarOff, CalendarPlus, Check } from "lucide-react";
import { EmptyState, ErrorState, FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";
import { Appointment, formatDay, formatTime } from "@/lib/appointments";
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
  timeZone,
  onBooked,
}: {
  cases: { id: string; title: string }[];
  /** Zona horaria de la firma (para la confirmación) */
  timeZone: string;
  onBooked: (appointment: Appointment | null) => void;
}) {
  const [lawyers, setLawyers] = useState<Option[] | null>(null);
  const [lawyersError, setLawyersError] = useState<string | null>(null);
  const [lawyersAttempt, setLawyersAttempt] = useState(0);
  const [lawyerId, setLawyerId] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reason, setReason] = useState("");
  /** Cita recién pedida: se muestra la confirmación en lugar del formulario */
  const [booked, setBooked] = useState<Appointment | null>(null);
  const formTop = useRef<HTMLHeadingElement>(null);
  const v = useFieldErrors<Field>(schemaFor(!!lawyerId), ["lawyer", "slot", "reason"], (k) => IDS[k]);
  const { errors } = v;

  useEffect(() => {
    setLawyersError(null);
    nestFetch<Option[]>("/appointments/lawyers")
      .then((list) => {
        setLawyers(list);
        if (list.length === 1) setLawyerId(list[0].id);
      })
      .catch((err) => setLawyersError(errorMessage(err, "No se pudieron cargar los abogados.")));
  }, [lawyersAttempt]);

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
      const created = await nestFetch<Appointment>("/appointments", {
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
      const appointment = created && typeof created === "object" && "id" in created ? created : null;
      setBooked(
        appointment ?? {
          // Por si la API no devolviera la cita: la confirmación se arma con lo elegido
          id: "",
          startsAt,
          endsAt: startsAt,
          status: "pendiente",
          reason: cleanReason || null,
          note: null,
          lawyer: { id: lawyerId, name: lawyers?.find((l) => l.id === lawyerId)?.name ?? "tu abogado" },
          client: { id: "", name: "", email: "" },
          case: null,
        },
      );
      onBooked(appointment);
    } catch (err) {
      // 409: alguien reservó ese hueco a la vez → recargar los horarios
      setReloadKey((k) => k + 1);
      setMessage({ type: "error", text: errorMessage(err, "No se pudo pedir la cita.") });
    } finally {
      setLoading(false);
    }
  }

  function bookAnother() {
    setBooked(null);
    setMessage(null);
    // El foco vuelve al principio del formulario
    requestAnimationFrame(() => formTop.current?.focus());
  }

  return (
    <section className="card" aria-labelledby="book-title">
      <div className="border-b border-slate-900/[0.06] px-4 py-4 sm:px-5">
        <h2 id="book-title" ref={formTop} tabIndex={-1} className="font-display text-[1.25rem] font-medium tracking-[-0.015em] text-slate-900 focus:outline-none">
          Pedir una cita
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
          Elige el día y la hora. La cita queda pendiente hasta que el despacho la confirme.
        </p>
      </div>

      {booked ? (
        <BookedConfirmation appointment={booked} timeZone={timeZone} onAnother={bookAnother} />
      ) : (
        <form onSubmit={onSubmit} noValidate aria-busy={loading} className="space-y-5 px-4 py-5 sm:px-5">
          {lawyersError && !lawyers ? (
            <ErrorState message={lawyersError} onRetry={() => setLawyersAttempt((n) => n + 1)} />
          ) : lawyers && lawyers.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="Aún no hay horarios de atención"
              hint="Cuando el despacho publique sus horarios podrás pedir una cita aquí."
            />
          ) : (
            // Mientras se envía, nada se puede cambiar ni volver a pulsar
            <fieldset disabled={loading} className="space-y-5 disabled:opacity-90">
              <legend className="sr-only">Datos de la cita</legend>
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
                <button type="submit" className="btn-primary w-full">
                  {loading && <Spinner />}
                  {loading ? "Reservando tu cita…" : "Pedir cita"}
                </button>
                {!startsAt && !loading && !errors.slot && !errors.lawyer && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    {lawyerId ? "Elige una hora para continuar." : "Elige un abogado para ver sus horarios."}
                  </p>
                )}
              </div>
            </fieldset>
          )}
          {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
        </form>
      )}
    </section>
  );
}

/** Confirmación visual de la cita pedida: qué, cuándo, con quién y qué pasa ahora. */
function BookedConfirmation({
  appointment: a,
  timeZone,
  onAnother,
}: {
  appointment: Appointment;
  timeZone: string;
  onAnother: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  // El foco pasa a la confirmación: el lector de pantalla la lee y el teclado sigue desde aquí
  useEffect(() => heading.current?.focus(), []);

  async function addToCalendar() {
    if (!a.id || downloading) return;
    setDownloading(true);
    try {
      await nestDownloadFile(`/appointments/${a.id}/calendar`, `cita-${a.id}.ics`);
    } catch (err) {
      toast("error", errorMessage(err, "No se pudo generar el archivo de calendario."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div role="status" className="confirm-panel px-4 py-6 text-center sm:px-5">
      <span className="confirm-pop mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-500/10">
        <Check className="h-6 w-6" strokeWidth={2.4} aria-hidden />
      </span>
      <h3 ref={heading} tabIndex={-1} className="mt-4 font-display text-[1.25rem] font-medium tracking-[-0.015em] text-slate-900 focus:outline-none">
        Cita solicitada
      </h3>
      <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-slate-500">
        Te avisaremos por email en cuanto el despacho la confirme.
      </p>

      <dl className="mx-auto mt-5 max-w-sm divide-y divide-slate-900/[0.06] rounded-[12px] border border-slate-900/[0.08] text-left text-sm">
        <div className="flex items-start gap-3 px-4 py-3">
          <dt className="w-20 shrink-0 text-slate-500">Cuándo</dt>
          <dd className="font-medium text-slate-900">
            {formatDay(a.startsAt, timeZone)}
            <span className="tabular-nums"> · {formatTime(a.startsAt, timeZone)}</span>
          </dd>
        </div>
        <div className="flex items-start gap-3 px-4 py-3">
          <dt className="w-20 shrink-0 text-slate-500">Con</dt>
          <dd className="font-medium text-slate-900">{a.lawyer.name}</dd>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <dt className="w-20 shrink-0 text-slate-500">Estado</dt>
          <dd>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
              <CalendarCheck2 className="h-3 w-3" aria-hidden />
              Pendiente de confirmar
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
        {a.id && (
          <button type="button" onClick={addToCalendar} disabled={downloading} className="btn-secondary">
            {downloading ? <Spinner className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" aria-hidden />}
            Añadir a mi calendario
          </button>
        )}
        <button type="button" onClick={onAnother} className="btn-ghost">
          Pedir otra cita
        </button>
      </div>
    </div>
  );
}
