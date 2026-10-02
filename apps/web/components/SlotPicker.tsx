"use client";

import { useEffect, useMemo, useState } from "react";
import { nestFetch } from "@/lib/nest-api";
import { SlotsResponse, formatTime, groupByDay } from "@/lib/appointments";
import { FormMessage, Spinner, errorMessage } from "./ui";

const DAYS_AHEAD = 21;

/** Huecos libres de un abogado (calculados por la API) agrupados por día. */
export function SlotPicker({
  lawyerId,
  value,
  onChange,
  reloadKey = 0,
}: {
  lawyerId: string;
  value: string | null;
  onChange: (startsAt: string | null) => void;
  /** Cambiarlo fuerza a recargar (p. ej. tras reservar) */
  reloadKey?: number;
}) {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    onChange(null);
    nestFetch<SlotsResponse>(`/appointments/slots?lawyerId=${encodeURIComponent(lawyerId)}&days=${DAYS_AHEAD}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setDay(res.slots.length ? groupByDay(res.slots, res.timeZone)[0].day : null);
      })
      .catch((err) => !cancelled && setError(errorMessage(err, "No se pudieron cargar los horarios.")));
    return () => {
      cancelled = true;
    };
    // onChange se omite a propósito: solo se limpia al cambiar de abogado o recargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyerId, reloadKey]);

  const groups = useMemo(() => (data ? groupByDay(data.slots, data.timeZone) : []), [data]);
  const selected = groups.find((g) => g.day === day);

  if (error) return <FormMessage type="error">{error}</FormMessage>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <Spinner className="h-4 w-4" /> Buscando horarios libres…
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
        No hay horarios libres en las próximas {DAYS_AHEAD / 7} semanas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Día">
        {groups.map((g) => (
          <button
            key={g.day}
            type="button"
            role="tab"
            aria-selected={g.day === day}
            onClick={() => setDay(g.day)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition ${
              g.day === day
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand-500"
            }`}
          >
            <span className="block font-semibold">{g.label.split(",")[0]}</span>
            <span className="block opacity-80">{g.label.split(",")[1]?.trim()}</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Hora">
          {selected.items.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              role="radio"
              aria-checked={value === s.startsAt}
              onClick={() => onChange(s.startsAt)}
              className={`rounded-lg border px-2 py-2 text-sm font-medium tabular-nums transition ${
                value === s.startsAt
                  ? "border-brand-700 bg-brand-50 text-brand-900 ring-2 ring-brand-500/30"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-500"
              }`}
            >
              {formatTime(s.startsAt, data.timeZone)}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">
        Horario de la firma ({data.timeZone.replace("_", " ")}) · citas de {data.slotMinutes} min
      </p>
    </div>
  );
}
