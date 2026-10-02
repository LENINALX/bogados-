"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { APPOINTMENT_STATUS_LABELS } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { Appointment, STATUS_BADGE, formatTime, groupByDay } from "@/lib/appointments";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";

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
    if (!pending) return;
    setSaving(true);
    try {
      await nestFetch(`/appointments/${pending.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: pending.action, note: note.trim() || undefined }),
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
        <div className="space-y-3 p-4 sm:p-5">
          <span className="sr-only">Cargando citas…</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-100 p-3">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton mt-2 h-3 w-56" />
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
        <h2 className="card-title">{mode === "staff" ? "Próximas citas" : "Mis citas"}</h2>
        {requests > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            {requests} por confirmar
          </span>
        )}
      </div>
      {error && (
        <div className="px-4 pt-3 sm:px-5">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          title="No hay citas próximas"
          hint={mode === "client" ? "Pide una con el formulario." : "Las solicitudes de tus clientes aparecerán aquí."}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {groupByDay(items, timeZone).map((group) => (
            <div key={group.day} className="px-4 py-3 sm:px-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3>
              <ul className="space-y-2">
                {group.items.map((a) => {
                  const actions = actionsFor(a, mode, now);
                  const other = mode === "staff" ? a.client.name : a.lawyer.name;
                  return (
                    <li key={a.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums text-slate-900">
                              {formatTime(a.startsAt, timeZone)}–{formatTime(a.endsAt, timeZone)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[a.status]}`}>
                              {APPOINTMENT_STATUS_LABELS[a.status]}
                            </span>
                          </div>
                          <div className="mt-0.5 text-sm text-slate-700">
                            {mode === "staff" ? "Cliente: " : "Con "}
                            <span className="font-medium">{other}</span>
                            {mode === "staff" && a.lawyer && <span className="text-slate-400"> · {a.lawyer.name}</span>}
                          </div>
                          {a.case && (
                            <Link
                              href={mode === "staff" ? `/casos/${a.case.id}` : `/portal/casos/${a.case.id}`}
                              className="text-xs text-brand-700 hover:underline"
                            >
                              {a.case.title}
                            </Link>
                          )}
                          {a.reason && <p className="mt-1 text-xs text-slate-500">Motivo: {a.reason}</p>}
                          {a.note && <p className="mt-0.5 text-xs text-slate-500">Comentario: {a.note}</p>}
                        </div>
                        {actions.length > 0 && pending?.id !== a.id && (
                          <div className="flex flex-wrap gap-2">
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
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          {pending.action !== "completada" && (
                            <textarea
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              maxLength={500}
                              rows={2}
                              className="input"
                              placeholder={
                                pending.action === "cancelada"
                                  ? "Motivo de la cancelación (opcional, se enviará por email)"
                                  : "Comentario para el cliente (opcional, p. ej. qué traer)"
                              }
                            />
                          )}
                          <div className="flex gap-2">
                            <button type="button" disabled={saving} onClick={apply} className="btn-primary btn-sm">
                              {saving && <Spinner className="h-3 w-3" />}
                              {ACTION_LABEL[pending.action]}
                            </button>
                            <button type="button" disabled={saving} onClick={() => setPending(null)} className="btn-secondary btn-sm">
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
