"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX, Check, Clock } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { SlotsResponse, formatDay, formatTime, groupByDay } from "@/lib/appointments";
import { EmptyState, FormMessage, errorMessage } from "./ui";

const DAYS_AHEAD = 21;

/** Partes de la fecha de un día para su casilla: «vie», «23», «oct» */
function dayParts(iso: string, timeZone: string) {
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-EC", { timeZone, ...opts }).format(new Date(iso)).replace(/\./g, "");
  return { weekday: part({ weekday: "short" }), day: part({ day: "numeric" }), month: part({ month: "short" }) };
}

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
      <div aria-busy="true">
        <p role="status" className="sr-only">
          Buscando horarios libres…
        </p>
        <div className="flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[68px] w-[60px] shrink-0 rounded-[10px]" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-slate-900/[0.12]">
        <EmptyState
          icon={CalendarX}
          title={`Sin horarios libres en las próximas ${DAYS_AHEAD / 7} semanas`}
          hint="Prueba con otro abogado o vuelve a mirar en unos días."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desplazamiento horizontal en móvil; el margen negativo deja ver que hay más días */}
      <div
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1.5 pt-0.5 [scrollbar-width:thin]"
        role="tablist"
        aria-label="Día"
      >
        {groups.map((g) => {
          const active = g.day === day;
          const p = dayParts(g.items[0].startsAt, data.timeZone);
          return (
            <button
              key={g.day}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${g.label}, ${g.items.length} ${g.items.length === 1 ? "horario libre" : "horarios libres"}`}
              onClick={() => setDay(g.day)}
              className={`flex w-[60px] shrink-0 snap-start flex-col items-center rounded-[10px] border py-2 transition-[background-color,border-color,color] duration-150 ease-[var(--ease-premium)] active:scale-[0.97] ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(17_27_25/0.2)]"
                  : "border-slate-900/[0.1] bg-surface text-slate-700 hover:border-slate-900/[0.22] hover:bg-slate-50"
              }`}
            >
              <span className={`text-[11px] capitalize ${active ? "text-white/75" : "text-slate-500"}`}>{p.weekday}</span>
              <span className="font-display text-[1.25rem] font-medium leading-tight tabular-nums">{p.day}</span>
              <span className={`text-[11px] ${active ? "text-white/75" : "text-slate-500"}`}>{p.month}</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={`Hora del ${selected.label}`}>
          {selected.items.map((s) => {
            const checked = value === s.startsAt;
            return (
              <button
                key={s.startsAt}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onChange(s.startsAt)}
                className={`relative h-10 rounded-lg border text-sm font-medium tabular-nums transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-premium)] active:scale-[0.97] ${
                  checked
                    ? "border-brand-600 bg-brand-50 text-brand-800 ring-[3px] ring-brand-600/15"
                    : "border-slate-900/[0.1] bg-surface text-slate-700 hover:border-slate-900/[0.22] hover:bg-slate-50"
                }`}
              >
                {formatTime(s.startsAt, data.timeZone)}
                {checked && <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-brand-700" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
      <p aria-live="polite" className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {value ? (
          <span>
            Has elegido el <span className="font-medium text-slate-800">{formatDay(value, data.timeZone).toLowerCase()}</span> a
            las <span className="font-medium tabular-nums text-slate-800">{formatTime(value, data.timeZone)}</span> · citas de{" "}
            {data.slotMinutes} min
          </span>
        ) : (
          <span>
            Hora de la firma ({data.timeZone.replace("_", " ")}) · citas de {data.slotMinutes} min
          </span>
        )}
      </p>
    </div>
  );
}
