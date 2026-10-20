"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { WEEKDAY_LABELS } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";
import { LIMITS, checkTimeBlocks } from "@/lib/validation";
import { FieldError, INVALID_INPUT, fieldA11y } from "./form/FieldError";

type Block = { weekday: number; start: string; end: string };

/** Orden de lunes a domingo para mostrar */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilityEditor({ lawyerId, onSaved }: { lawyerId: string; onSaved?: () => void }) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Los errores por franja se muestran tras el primer intento de guardar y luego se actualizan al vuelo
  const [checked, setChecked] = useState(false);
  const toast = useToast();

  useEffect(() => {
    nestFetch<Block[]>(`/lawyers/${lawyerId}/availability`)
      .then(setBlocks)
      .catch((err) => setMessage({ type: "error", text: errorMessage(err, "No se pudo cargar la disponibilidad.") }));
  }, [lawyerId]);

  const update = (i: number, patch: Partial<Block>) =>
    setBlocks((list) => list!.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const blockErrors = blocks ? checkTimeBlocks(blocks) : [];
  const rowId = (i: number) => `avail-${i}`;

  async function save() {
    if (!blocks || saving) return;
    setMessage(null);
    setChecked(true);
    // Foco a la primera franja con error en el orden en que se ven (lunes → domingo)
    const first = sorted?.find(({ i }) => blockErrors[i])?.i;
    if (first !== undefined) {
      document.getElementById(`${rowId(first)}-start`)?.focus();
      return;
    }
    if (blocks.length > LIMITS.availabilityBlocks) {
      setMessage({ type: "error", text: `Puedes tener como máximo ${LIMITS.availabilityBlocks} franjas.` });
      return;
    }
    setSaving(true);
    try {
      const saved = await nestFetch<Block[]>(`/lawyers/${lawyerId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ blocks }),
      });
      setBlocks(saved);
      setChecked(false);
      toast("success", "Disponibilidad guardada");
      onSaved?.();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "No se pudo guardar.") });
    } finally {
      setSaving(false);
    }
  }

  const sorted = blocks
    ?.map((b, i) => ({ b, i }))
    .sort((x, y) => WEEK_ORDER.indexOf(x.b.weekday) - WEEK_ORDER.indexOf(y.b.weekday) || x.b.start.localeCompare(y.b.start));

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" aria-hidden />
          Mi disponibilidad
        </h2>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <p className="text-[13px] leading-relaxed text-slate-500">
          Franjas semanales en las que los clientes pueden pedirte cita (hora de la firma).
        </p>
        {!blocks ? (
          message ? null : <Spinner className="h-4 w-4 text-slate-400" />
        ) : (
          <>
            {sorted!.length === 0 && (
              <p className="rounded-[10px] border border-dashed border-slate-900/[0.12] px-3 py-3 text-[13px] text-slate-500">
                Sin franjas: tus clientes aún no pueden pedirte cita.
              </p>
            )}
            <ul className="space-y-2">
              {sorted!.map(({ b, i }) => {
                const error = checked ? blockErrors[i] : null;
                return (
                  <li key={i}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        aria-label="Día"
                        value={b.weekday}
                        onChange={(e) => update(i, { weekday: Number(e.target.value) })}
                        className="input w-[7.5rem] py-1.5"
                      >
                        {WEEK_ORDER.map((d) => (
                          <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>
                        ))}
                      </select>
                      <input
                        id={`${rowId(i)}-start`}
                        type="time"
                        aria-label={`Desde (${WEEKDAY_LABELS[b.weekday]})`}
                        value={b.start}
                        step={900}
                        required
                        onChange={(e) => update(i, { start: e.target.value })}
                        {...fieldA11y(rowId(i), error)}
                        className={`input w-[6.5rem] py-1.5 tabular-nums ${error ? INVALID_INPUT : ""}`}
                      />
                      <span className="text-slate-400" aria-hidden>
                        a
                      </span>
                      <input
                        type="time"
                        aria-label={`Hasta (${WEEKDAY_LABELS[b.weekday]})`}
                        value={b.end}
                        step={900}
                        required
                        onChange={(e) => update(i, { end: e.target.value })}
                        {...fieldA11y(rowId(i), error)}
                        className={`input w-[6.5rem] py-1.5 tabular-nums ${error ? INVALID_INPUT : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setBlocks((list) => list!.filter((_, j) => j !== i))}
                        className="btn-ghost btn-sm h-8 w-8 p-0 text-slate-400 hover:text-red-700"
                        aria-label={`Quitar franja del ${WEEKDAY_LABELS[b.weekday]}`}
                        title="Quitar franja"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <FieldError id={rowId(i)} error={error} className="mt-1" />
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBlocks((list) => [...list!, { weekday: 1, start: "09:00", end: "13:00" }])}
                disabled={blocks.length >= LIMITS.availabilityBlocks}
                title={blocks.length >= LIMITS.availabilityBlocks ? `Máximo ${LIMITS.availabilityBlocks} franjas` : undefined}
                className="btn-secondary btn-sm"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Añadir franja
              </button>
              <button type="button" disabled={saving} onClick={save} className="btn-primary btn-sm">
                {saving && <Spinner className="h-3 w-3" />}
                Guardar
              </button>
            </div>
          </>
        )}
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </div>
    </section>
  );
}
