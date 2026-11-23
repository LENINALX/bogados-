"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { APPOINTMENT_STATUS_LABELS } from "@bogados/shared";
import { nestDownloadFile, nestFetch } from "@/lib/nest-api";
import { CalendarDays, CalendarPlus, CalendarX2, CircleCheck, ClipboardCheck } from "lucide-react";
import { Appointment, formatDay, formatTime, groupByDay } from "@/lib/appointments";
import { EmptyState, ErrorState, FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";
import { APPOINTMENT_TONE, Badge } from "./staff/primitives";
import { LIMITS, clean } from "@/lib/validation";
import { CharCount, countId } from "./form/FieldError";

type Action = "confirmada" | "cancelada" | "completada";
type Mode = "staff" | "client";

const DONE_MESSAGE: Record<Action, string> = {
  confirmada: "Cita confirmada · el cliente recibirá un email",
  cancelada: "Cita cancelada",
  completada: "Cita marcada como completada",
};

const ACTION_LABEL: Record<Action, string> = {
  confirmada: "Confirmar",
  cancelada: "Cancelar cita",
  completada: "Marcar completada",
};

/** Botón principal del panel de confirmación, y su texto mientras se guarda */
const CONFIRM_LABEL: Record<Action, { idle: string; busy: string }> = {
  confirmada: { idle: "Confirmar cita", busy: "Confirmando…" },
  cancelada: { idle: "Sí, cancelar la cita", busy: "Cancelando…" },
  completada: { idle: "Marcar completada", busy: "Guardando…" },
};

/** Cuánto dura el destello de la fila recién creada o cambiada */
const FLASH_MS = 1900;

/** Acciones posibles según quién mira y el estado (mismas reglas que la API). */
function actionsFor(a: Appointment, mode: Mode, now: number): Action[] {
  const started = new Date(a.startsAt).getTime() <= now;
  const active = a.status === "pendiente" || a.status === "confirmada";
  if (mode === "client") return active && !started ? ["cancelada"] : [];
  const list: Action[] = [];
  if (a.status === "pendiente") list.push("confirmada");
  if (a.status === "confirmada" && started) list.push("completada");
  if (active) list.push("cancelada");
  return list;
}

const actionButtonId = (appointmentId: string, action: Action) => `appt-${appointmentId}-${action}`;

export function AppointmentList({
  mode,
  timeZone,
  reloadKey = 0,
  highlightId = null,
  onChanged,
}: {
  mode: Mode;
  timeZone: string;
  reloadKey?: number;
  /** Cita recién creada: su fila destella al aparecer */
  highlightId?: string | null;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [pending, setPending] = useState<{ id: string; action: Action } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingCalendar, setDownloadingCalendar] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const list = await nestFetch<Appointment[]>("/appointments");
      setItems(list);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las citas."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (highlightId) setFlashId(highlightId);
  }, [highlightId, reloadKey]);

  useEffect(() => {
    if (!flashId) return;
    const t = window.setTimeout(() => setFlashId(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [flashId]);

  async function retry() {
    setRetrying(true);
    await load();
    setRetrying(false);
  }

  function openConfirm(id: string, action: Action) {
    setPending({ id, action });
    setNote("");
    setActionError(null);
  }

  /** Volver sin cambiar nada: el foco regresa al botón que abrió la confirmación */
  function closeConfirm() {
    if (saving || !pending) return;
    const back = actionButtonId(pending.id, pending.action);
    setPending(null);
    setActionError(null);
    requestAnimationFrame(() => document.getElementById(back)?.focus());
  }

  async function apply() {
    if (!pending || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await nestFetch(`/appointments/${pending.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: pending.action, note: clean(note) || undefined }),
      });
      toast("success", DONE_MESSAGE[pending.action]);
      setFlashId(pending.id);
      setPending(null);
      setNote("");
      await load();
      onChanged?.();
    } catch (err) {
      // El error se queda en el panel, junto a la acción que lo causó
      setActionError(errorMessage(err, "No se pudo actualizar la cita. Inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  }

  async function addToCalendar(id: string) {
    setDownloadingCalendar(id);
    try {
      await nestDownloadFile(`/appointments/${id}/calendar`, `cita-${id}.ics`);
    } catch (err) {
      toast("error", errorMessage(err, "No se pudo generar el archivo de calendario."));
    } finally {
      setDownloadingCalendar(null);
    }
  }

  if (!items) {
    return error ? (
      <section className="card" aria-labelledby="appt-list-title">
        <div className="card-header">
          <h2 id="appt-list-title" className="card-title flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />
            {mode === "staff" ? "Próximas citas" : "Mis citas"}
          </h2>
        </div>
        <ErrorState message={error} onRetry={retry} retrying={retrying} className="px-4 py-4 sm:px-5" />
      </section>
    ) : (
      // Esqueleto con la forma final: la carga no hace saltar el diseño
      <section className="card" aria-busy="true">
        <div className="card-header">
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="space-y-2 px-4 py-4 sm:px-5">
          <p role="status" className="sr-only">Cargando citas…</p>
          <div className="skeleton mb-3 h-3.5 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-[10px] border border-slate-900/[0.06] p-3.5">
              <div className="skeleton h-4 w-12" />
              <div className="flex-1">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton mt-2 h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const now = Date.now();
  const requests = mode === "staff" ? items.filter((a) => a.status === "pendiente").length : 0;

  return (
    <section className="card" aria-labelledby="appt-list-title">
      <div className="card-header">
        <h2 id="appt-list-title" className="card-title flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />
          {mode === "staff" ? "Próximas citas" : "Mis citas"}
        </h2>
        {requests > 0 && <Badge tone="amber">{requests} por confirmar</Badge>}
      </div>
      {error && (
        <div className="px-4 pt-3 sm:px-5">
          <ErrorState message={error} onRetry={retry} retrying={retrying} />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay citas próximas"
          hint={
            mode === "client"
              ? "Pide una con el formulario: verás los horarios libres de tu abogado."
              : "Las solicitudes de tus clientes y las citas que programes aparecerán aquí."
          }
        />
      ) : (
        <div className="divide-y divide-slate-900/[0.06]">
          {groupByDay(items, timeZone).map((group) => (
            <div key={group.day} className="px-4 py-4 sm:px-5">
              <h3 className="mb-2.5 flex items-baseline gap-2 text-[13px] font-semibold text-slate-900">
                {group.label}
                <span className="text-xs font-normal tabular-nums text-slate-500">
                  {group.items.length} {group.items.length === 1 ? "cita" : "citas"}
                </span>
              </h3>
              <ul className="space-y-2">
                {group.items.map((a) => {
                  const actions = actionsFor(a, mode, now);
                  const other = mode === "staff" ? a.client.name : a.lawyer.name;
                  const isPending = pending?.id === a.id;
                  return (
                    <li
                      key={a.id}
                      aria-busy={isPending && saving}
                      className={`rounded-[10px] border p-3 transition-[border-color,opacity] duration-200 sm:p-3.5 ${
                        isPending && pending.action === "cancelada"
                          ? "border-red-200"
                          : a.status === "pendiente" && mode === "staff"
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-slate-900/[0.08]"
                      } ${a.status === "cancelada" ? "opacity-60" : ""} ${flashId === a.id ? "appt-flash" : ""}`}
                    >
                      <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto]">
                        <div className="tabular-nums">
                          <div className="text-sm font-semibold text-slate-900">{formatTime(a.startsAt, timeZone)}</div>
                          <div className="text-xs text-slate-500">
                            <span className="sr-only">hasta las </span>
                            {formatTime(a.endsAt, timeZone)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium text-slate-900">
                              {mode === "staff" ? other : `Con ${other}`}
                            </span>
                            <Badge
                              tone={APPOINTMENT_TONE[a.status]}
                              className={a.status === "cancelada" ? "line-through" : ""}
                            >
                              {APPOINTMENT_STATUS_LABELS[a.status]}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-[13px] text-slate-500">
                            {a.case ? (
                              <Link
                                href={mode === "staff" ? `/casos/${a.case.id}` : `/portal/casos/${a.case.id}`}
                                className="text-brand-700 underline-offset-2 hover:underline"
                              >
                                {a.case.title}
                              </Link>
                            ) : (
                              "Sin caso asociado"
                            )}
                            {mode === "staff" && a.lawyer && <span> · {a.lawyer.name}</span>}
                          </div>
                          {a.reason && <p className="mt-1.5 text-xs text-slate-600">Motivo: {a.reason}</p>}
                          {a.note && <p className="mt-0.5 text-xs text-slate-600">Comentario: {a.note}</p>}
                        </div>
                        {(actions.length > 0 || a.status !== "cancelada") && !isPending && (
                          <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end sm:self-start">
                            {actions.map((action) => (
                              <button
                                key={action}
                                id={actionButtonId(a.id, action)}
                                type="button"
                                // Una acción a la vez: mientras se guarda otra, el resto espera
                                disabled={saving}
                                onClick={() => openConfirm(a.id, action)}
                                aria-label={`${ACTION_LABEL[action]}: ${group.label}, ${formatTime(a.startsAt, timeZone)}, ${other}`}
                                className={action === "confirmada" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                              >
                                {ACTION_LABEL[action]}
                              </button>
                            ))}
                            {a.status !== "cancelada" && (
                              <button
                                type="button"
                                onClick={() => addToCalendar(a.id)}
                                disabled={downloadingCalendar !== null}
                                aria-label={`Añadir a mi calendario: ${group.label}, ${formatTime(a.startsAt, timeZone)}`}
                                className="btn-secondary btn-sm"
                              >
                                {downloadingCalendar === a.id ? (
                                  <Spinner className="h-3.5 w-3.5" />
                                ) : (
                                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                                )}
                                Añadir a mi calendario
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {isPending && (
                        <ActionConfirm
                          appointment={a}
                          action={pending.action}
                          mode={mode}
                          other={other}
                          timeZone={timeZone}
                          note={note}
                          onNote={setNote}
                          saving={saving}
                          error={actionError}
                          onConfirm={apply}
                          onBack={closeConfirm}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Confirmación dentro de la fila antes de cambiar una cita: dice qué va a pasar y a quién se avisa.
 * Cancelar se pinta en rojo y su botón dice exactamente lo que hace; «No, mantenerla» es la salida segura.
 */
function ActionConfirm({
  appointment: a,
  action,
  mode,
  other,
  timeZone,
  note,
  onNote,
  saving,
  error,
  onConfirm,
  onBack,
}: {
  appointment: Appointment;
  action: Action;
  mode: Mode;
  other: string;
  timeZone: string;
  note: string;
  onNote: (v: string) => void;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLParagraphElement>(null);
  const noteId = `appt-note-${a.id}`;
  const descId = `appt-confirm-desc-${a.id}`;
  const cancelling = action === "cancelada";

  // Al abrir, el foco va al panel: el lector de pantalla lee la pregunta y sus consecuencias
  useEffect(() => heading.current?.focus(), []);

  const when = `${formatDay(a.startsAt, timeZone)} a las ${formatTime(a.startsAt, timeZone)}`;
  const title =
    action === "cancelada" ? "¿Cancelar esta cita?" : action === "confirmada" ? "¿Confirmar esta cita?" : "¿Marcar la cita como completada?";
  const consequence =
    action === "cancelada"
      ? `${other} recibirá un email avisando de la cancelación${note.trim() ? " con el motivo que escribas" : ""}. El horario quedará libre${
          mode === "client" ? "; si lo necesitas, podrás pedir otra cita" : ""
        }.`
      : action === "confirmada"
        ? `${other} recibirá un email de confirmación${note.trim() ? " con tu comentario" : ""}.`
        : "Quedará en el historial como atendida.";
  const Icon = action === "cancelada" ? CalendarX2 : action === "confirmada" ? CircleCheck : ClipboardCheck;

  return (
    <div
      role="group"
      aria-labelledby={`${descId}-title`}
      aria-describedby={descId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onBack();
        }
      }}
      className={`confirm-panel mt-3 rounded-[10px] border p-3 sm:p-3.5 ${
        cancelling ? "border-red-200 bg-red-50/60" : "border-slate-900/[0.08] bg-slate-900/[0.02]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cancelling ? "text-red-600" : "text-brand-700"}`} aria-hidden />
        <div className="min-w-0">
          <p
            id={`${descId}-title`}
            ref={heading}
            tabIndex={-1}
            className="text-sm font-semibold text-slate-900 focus:outline-none"
          >
            {title}
          </p>
          <p id={descId} className="mt-0.5 text-[13px] leading-relaxed text-slate-600">
            <span className="font-medium text-slate-800">{when}</span>
{` con ${other}`}. {consequence}
          </p>
        </div>
      </div>

      {action !== "completada" && (
        <div className="mt-3">
          <label htmlFor={noteId} className="sr-only">
            {cancelling ? "Motivo de la cancelación (opcional)" : "Comentario para el cliente (opcional)"}
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            disabled={saving}
            maxLength={LIMITS.appointmentNote}
            aria-describedby={countId(noteId, note.length, LIMITS.appointmentNote)}
            rows={2}
            className="input"
            placeholder={
              cancelling
                ? "Motivo de la cancelación (opcional, se enviará por email)"
                : "Comentario para el cliente (opcional, p. ej. qué traer)"
            }
          />
          <CharCount id={noteId} length={note.length} max={LIMITS.appointmentNote} className="mt-1 text-right" />
        </div>
      )}

      {error && (
        <div className="mt-3">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className={
            cancelling
              ? "btn btn-sm bg-red-600 text-white shadow-[0_1px_2px_rgb(23_21_17/0.2)] hover:bg-red-700"
              : "btn-primary btn-sm"
          }
        >
          {saving && <Spinner className="h-3 w-3" />}
          {saving ? CONFIRM_LABEL[action].busy : CONFIRM_LABEL[action].idle}
        </button>
        <button type="button" disabled={saving} onClick={onBack} className="btn-ghost btn-sm">
          {cancelling ? "No, mantenerla" : "Volver"}
        </button>
      </div>
    </div>
  );
}
