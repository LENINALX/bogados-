"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Download, Trash2 } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { formatYmdLong } from "@/lib/terms";
import { LIMITS, clean, rules } from "@/lib/validation";
import { EmptyState, FormMessage, errorMessage } from "./ui";
import { FieldError, INVALID_INPUT, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type Holiday = { id: string; date: string; name: string };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Lista de feriados del año: añadir (locales, traslados), eliminar y cargar los nacionales. */
export function HolidaysManager({ year, initial }: { year: number; initial: Holiday[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const v = useFieldErrors<"date" | "name">(
    {
      date: [
        rules.required("Elige la fecha del día no hábil."),
        rules.date(),
        rules.dateBetween(`${year}-01-01`, `${year}-12-31`, `La fecha debe ser de ${year}.`),
      ],
      name: [
        rules.required("Escribe el motivo, por ejemplo «Fundación de Manta»."),
        rules.minLength(LIMITS.holidayName.min, `El motivo debe tener al menos ${LIMITS.holidayName.min} caracteres.`),
        rules.maxLength(LIMITS.holidayName.max),
      ],
    },
    ["date", "name"],
    (k) => `holiday-${k}`,
  );

  async function run(key: string, action: () => Promise<string>) {
    setBusy(key);
    setMessage(null);
    try {
      setMessage({ type: "success", text: await action() });
      router.refresh();
    } catch (err) {
      const text = errorMessage(err, "No se pudo completar la acción.");
      if (key === "add" && /feriado registrado en esa fecha/i.test(text)) v.set("date", "Ya hay un feriado registrado en esa fecha.");
      else setMessage({ type: "error", text });
    } finally {
      setBusy(null);
    }
  }

  function add(e: FormEvent) {
    e.preventDefault();
    if (busy === "add") return;
    const cleanName = clean(name);
    if (!v.submit({ date, name: cleanName })) return;
    run("add", async () => {
      await nestFetch("/holidays", { method: "POST", body: JSON.stringify({ date, name: cleanName }) });
      setDate("");
      setName("");
      v.reset();
      return `Añadido: ${cleanName}.`;
    });
  }

  function remove(h: Holiday) {
    if (!confirm(`¿Eliminar «${h.name}» (${formatYmdLong(h.date)})? Los términos volverán a contar ese día.`)) return;
    run(h.id, async () => {
      await nestFetch(`/holidays/${h.id}`, { method: "DELETE" });
      return `Eliminado: ${h.name}.`;
    });
  }

  function loadNational() {
    run("national", async () => {
      const r = await nestFetch<{ created: number; skipped: number }>(`/holidays/national?year=${year}`, { method: "POST" });
      return r.created
        ? `Se cargaron ${r.created} feriados nacionales${r.skipped ? ` (${r.skipped} ya estaban)` : ""}. Revisa los traslados de este año.`
        : "Los feriados nacionales de este año ya estaban cargados.";
    });
  }

  const byMonth = MONTHS.map((label, i) => ({
    label,
    items: initial.filter((h) => Number(h.date.slice(5, 7)) === i + 1),
  })).filter((m) => m.items.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="card overflow-hidden" aria-label={`Feriados de ${year}`}>
        <div className="card-header">
          <h2 className="card-title">
            {initial.length} {initial.length === 1 ? "día no hábil" : "días no hábiles"} en {year}
          </h2>
        </div>
        {initial.length === 0 ? (
          <EmptyState
            title={`Aún no hay feriados en ${year}`}
            hint="Carga los nacionales con el botón de la derecha y añade los locales de tu cantón."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {byMonth.map((m) => (
              <div key={m.label} className="px-4 py-3 sm:px-5">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{m.label}</h3>
                <ul className="space-y-1">
                  {m.items.map((h) => (
                    <li key={h.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <span className="w-8 text-center text-lg font-light tabular-nums text-slate-900">
                        {Number(h.date.slice(8, 10))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{h.name}</span>
                        <span className="block text-xs text-slate-500 first-letter:uppercase">{formatYmdLong(h.date)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(h)}
                        disabled={busy === h.id}
                        className="btn-ghost btn-sm h-8 w-8 p-0 text-slate-400 hover:text-red-700"
                        aria-label={`Eliminar ${h.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

        <form onSubmit={add} noValidate className="card space-y-3 p-4">
          <h2 className="card-title flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-slate-500" aria-hidden />
            Añadir un día no hábil
          </h2>
          <label className="block text-xs font-medium text-slate-600">
            Fecha
            <input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                v.change("date", e.target.value);
              }}
              onBlur={(e) => e.target.value && v.blur("date", e.target.value)}
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              required
              {...fieldA11y("holiday-date", v.errors.date)}
              className={`input mt-1 ${v.errors.date ? INVALID_INPUT : ""}`}
            />
          </label>
          <FieldError id="holiday-date" error={v.errors.date} className="-mt-1.5" />
          <label className="block text-xs font-medium text-slate-600">
            Motivo
            <input
              id="holiday-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                v.change("name", clean(e.target.value));
              }}
              onBlur={(e) => e.target.value && v.blur("name", clean(e.target.value))}
              placeholder="Ej.: Fundación de Manta, traslado del 10 de agosto…"
              maxLength={LIMITS.holidayName.max}
              required
              {...fieldA11y("holiday-name", v.errors.name)}
              className={`input mt-1 ${v.errors.name ? INVALID_INPUT : ""}`}
            />
          </label>
          <FieldError id="holiday-name" error={v.errors.name} className="-mt-1.5" />
          <button type="submit" disabled={busy === "add"} className="btn-primary w-full">
            {busy === "add" ? "Añadiendo…" : "Añadir"}
          </button>
        </form>

        <div className="card space-y-2 p-4">
          <h2 className="card-title">Feriados nacionales</h2>
          <p className="text-xs leading-relaxed text-slate-500">
            Carga los feriados nacionales de Ecuador de {year} en su fecha original (Carnaval y Viernes Santo según la
            Pascua). Los que ya tengas no se tocan. <strong className="font-semibold text-slate-700">Revisa después los
            traslados</strong> que decrete el Gobierno y añade los feriados de tu cantón.
          </p>
          <button type="button" onClick={loadNational} disabled={busy === "national"} className="btn-secondary w-full">
            <Download className="h-4 w-4" aria-hidden />
            {busy === "national" ? "Cargando…" : `Cargar nacionales de ${year}`}
          </button>
        </div>
      </aside>
    </div>
  );
}
