"use client";

import { useEffect, useState } from "react";
import { WEEKDAY_LABELS } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";

type Block = { weekday: number; start: string; end: string };

/** Orden de lunes a domingo para mostrar */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilityEditor({ lawyerId, onSaved }: { lawyerId: string; onSaved?: () => void }) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    nestFetch<Block[]>(`/lawyers/${lawyerId}/availability`)
      .then(setBlocks)
      .catch((err) => setMessage({ type: "error", text: errorMessage(err, "No se pudo cargar la disponibilidad.") }));
  }, [lawyerId]);

  const update = (i: number, patch: Partial<Block>) =>
    setBlocks((list) => list!.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  async function save() {
    if (!blocks) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await nestFetch<Block[]>(`/lawyers/${lawyerId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ blocks }),
      });
      setBlocks(saved);
      setMessage({ type: "success", text: "Disponibilidad guardada." });
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
        <h2 className="card-title">Mi disponibilidad</h2>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <p className="text-xs text-slate-500">
          Franjas semanales en las que los clientes pueden pedirte cita (hora de la firma).
        </p>
        {!blocks ? (
          message ? null : <Spinner className="h-4 w-4 text-slate-400" />
        ) : (
          <>
            {sorted!.length === 0 && <p className="text-sm text-slate-400">Sin franjas: no se te pueden pedir citas.</p>}
            <ul className="space-y-2">
              {sorted!.map(({ b, i }) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Día"
                    value={b.weekday}
                    onChange={(e) => update(i, { weekday: Number(e.target.value) })}
                    className="input w-32 py-1.5"
                  >
                    {WEEK_ORDER.map((d) => (
                      <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    aria-label="Desde"
                    value={b.start}
                    step={900}
                    onChange={(e) => update(i, { start: e.target.value })}
                    className="input w-28 py-1.5"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    aria-label="Hasta"
                    value={b.end}
                    step={900}
                    onChange={(e) => update(i, { end: e.target.value })}
                    className="input w-28 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => setBlocks((list) => list!.filter((_, j) => j !== i))}
                    className="text-xs text-slate-500 hover:text-red-700"
                    aria-label={`Quitar franja del ${WEEKDAY_LABELS[b.weekday]}`}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBlocks((list) => [...list!, { weekday: 1, start: "09:00", end: "13:00" }])}
                className="btn-secondary btn-sm"
              >
                + Añadir franja
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
