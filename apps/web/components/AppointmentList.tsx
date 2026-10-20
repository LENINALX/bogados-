"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { APPOINTMENT_STATUS_LABELS } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { CalendarDays } from "lucide-react";
import { Appointment, formatTime, groupByDay } from "@/lib/appointments";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";
import { APPOINTMENT_TONE, Badge } from "./staff/primitives";
import { LIMITS, clean } from "@/lib/validation";
import { CharCount, countId } from "./form/FieldError";

type Action = "confirmada" | "cancelada" | "completada";

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

/** Acciones posibles según quién mira y el estado (mismas reglas que la API). */
function actionsFor(a: Appointment, mode: "staff" | "client", now: number): Action[] {
  const started = new Date(a.startsAt).getTime() <= now;
  const active = a.status === "pendiente" || a.status === "confirmada";
  if (mode === "client") return active && !started ? ["cancelada"] : [];
  const list: Action[] = [];
  if (a.status === "pendiente") list.push("confirmada");
  if (a.status === "confirmada" && started) list.push("completada");
  if (active) list.push("cancelada");
  return list;
}

export function AppointmentList({
  mode,
  timeZone,
  reloadKey = 0,
  onChanged,
}: {
  mode: "staff" | "client";
  timeZone: string;
  reloadKey?: number;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; action: Action } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    nestFetch<Appointment[]>("/appointments")
      .then((list) => {
        setItems(list);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err, "No se pudieron cargar las citas.")));
  }, []);

  useEffect(load, [load, reloadKey]);

  async function apply() {
    if (!pending || saving) return;
    setSaving(true);
    try {
      await nestFetch(`/appointments/${pending.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: pending.action, note: clean(note) || undefined }),
      });
      toast("success", DONE_MESSAGE[pending.action]);
      setPending(null);
      setNote("");
      load();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, "No se pudo actualizar la cita."));
    } finally {
      setSaving(false);
    }
  }

  if (!items) {
    return error ? (
      <FormMessage type="error">{error}</FormMessage>
    ) : (
      // Esqueleto con la forma final: la carga no hace saltar el diseño
      <section className="card" aria-busy="true">
        <div className="card-header">
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="space-y-2 px-4 py-4 sm:px-5">
          <span className="sr-only">Cargando citas…</span>
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
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />
          {mode === "staff" ? "Próximas citas" : "Mis citas"}
        </h2>
        {requests > 0 && <Badge tone="amber">{requests} por confirmar</Badge>}
      </div>
      {error && (
        <div className="px-4 pt-3 sm:px-5">
          <FormMessage type="error">{error}</FormMessage>
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
                <span className="text-xs font-normal tabular-nums text-slate-400">
                  {group.items.length} {group.items.length === 1 ? "cita" : "citas"}
                </span>
              </h3>
              <ul className="space-y-2">
                {group.items.map((a) => {
                  const actions = actionsFor(a, mode, now);
                  const other = mode === "staff" ? a.client.name : a.lawyer.name;
                  return (
                    <li
                      key={a.id}
                      className={`rounded-[10px] border p-3 transition-colors duration-150 sm:p-3.5 ${
                        a.status === "pendiente" && mode === "staff"
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-slate-900/[0.08]"
                      } ${a.status === "cancelada" ? "opacity-60" : ""}`}
                    >
                      <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto]">
                        <div className="tabular-nums">
                          <div className="text-sm font-semibold text-slate-900">{formatTime(a.startsAt, timeZone)}</div>
                          <div className="text-xs text-slate-500">{formatTime(a.endsAt, timeZone)}</div>
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
                        {actions.length > 0 && pending?.id !== a.id && (
                          <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end sm:self-start">
                            {actions.map((action) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => {
                                  setPending({ id: a.id, action });
                                  setNote("");
                                }}
                                className={action === "confirmada" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                              >
                                {ACTION_LABEL[action]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {pending?.id === a.id && (
                        <div className="mt-3 space-y-2 border-t border-slate-900/[0.06] pt-3">
                          {pending.action !== "completada" && (
                            <textarea
                              id={`appt-note-${a.id}`}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              maxLength={LIMITS.appointmentNote}
                              aria-describedby={countId(`appt-note-${a.id}`, note.length, LIMITS.appointmentNote)}
                              rows={2}
                              aria-label={pending.action === "cancelada" ? "Motivo de la cancelación" : "Comentario para el cliente"}
                              className="input"
                              placeholder={
                                pending.action === "cancelada"
                                  ? "Motivo de la cancelación (opcional, se enviará por email)"
                                  : "Comentario para el cliente (opcional, p. ej. qué traer)"
                              }
                            />
                          )}
                          {pending.action !== "completada" && (
                            <CharCount
                              id={`appt-note-${a.id}`}
                              length={note.length}
                              max={LIMITS.appointmentNote}
                              className="text-right"
                            />
                          )}
                          <div className="flex gap-2">
                            <button type="button" disabled={saving} onClick={apply} className="btn-primary btn-sm">
                              {saving && <Spinner className="h-3 w-3" />}
                              {ACTION_LABEL[pending.action]}
                            </button>
                            <button type="button" disabled={saving} onClick={() => setPending(null)} className="btn-ghost btn-sm">
                              Volver
                            </button>
                          </div>
                        </div>
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
