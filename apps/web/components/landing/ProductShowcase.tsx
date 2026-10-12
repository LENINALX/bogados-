"use client";

import { KeyboardEvent, useRef, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Check,
  FileText,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Paperclip,
} from "lucide-react";

type View = "despacho" | "cliente";
const VIEWS: { id: View; label: string }[] = [
  { id: "despacho", label: "Despacho" },
  { id: "cliente", label: "Cliente" },
];

/**
 * Vista previa del producto hecha con la propia interfaz (datos ficticios, decorativa).
 * El control segmentado alterna lo que ve el despacho y lo que ve su cliente; el cambio
 * es un fundido con un leve cambio de escala, interrumpible en cualquier momento.
 */
export function ProductShowcase() {
  const [view, setView] = useState<View>("despacho");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + VIEWS.length) % VIEWS.length;
    setView(VIEWS[next].id);
    tabs.current[next]?.focus();
  }

  const index = VIEWS.findIndex((v) => v.id === view);

  return (
    <div className="flex flex-col items-center">
      <div
        role="tablist"
        aria-label="Ver la plataforma como"
        className="relative grid grid-cols-2 rounded-full border border-slate-200/80 bg-slate-100/80 p-1 text-sm font-medium"
      >
        {/* Indicador que se desliza entre opciones */}
        <span
          aria-hidden
          className="segmented-thumb absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-surface shadow-sm shadow-slate-900/10"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {VIEWS.map((v, i) => (
          <button
            key={v.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls={`panel-${v.id}`}
            tabIndex={view === v.id ? 0 : -1}
            onClick={() => setView(v.id)}
            onKeyDown={(e) => onKey(e, i)}
            className="relative z-10 min-w-[7.5rem] rounded-full px-5 py-1.5 text-slate-500 transition-colors duration-200 aria-selected:text-slate-900 active:scale-[0.97]"
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="showcase-tilt mt-6 w-full sm:mt-8">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_40%,rgb(var(--brand-200)/0.55),transparent_70%)] blur-2xl"
          />
          <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-surface shadow-[0_30px_80px_-20px_rgb(15_23_42/0.25),0_1px_2px_rgb(15_23_42/0.06)]">
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="ml-3 text-xs font-medium text-slate-400">
                {view === "despacho" ? "Panel de la firma" : "Portal del cliente"}
              </span>
            </div>
            {/* Las dos vistas ocupan la misma celda: el marco no cambia de alto al alternar */}
            <div className="grid">
              <Panel id="despacho" active={view === "despacho"}>
                <FirmView />
              </Panel>
              <Panel id="cliente" active={view === "cliente"}>
                <ClientView />
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ id, active, children }: { id: View; active: boolean; children: React.ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      aria-hidden={!active}
      inert={!active ? ("" as unknown as boolean) : undefined}
      data-active={active}
      className="showcase-panel [grid-area:1/1]"
    >
      {children}
    </div>
  );
}

const CASES = [
  { title: "Demanda laboral — despido", who: "Carla Méndez", badge: "En curso", tone: "bg-emerald-100 text-emerald-800" },
  { title: "Constitución de compañía", who: "Grupo Andes S.A.", badge: "Nuevo", tone: "bg-amber-100 text-amber-800" },
  { title: "Accidente de tránsito", who: "Jorge Paz", badge: "En revisión", tone: "bg-sky-100 text-sky-800" },
  { title: "Divorcio por mutuo acuerdo", who: "Lucía Andrade", badge: "En curso", tone: "bg-emerald-100 text-emerald-800" },
];

function FirmView() {
  const nav = [
    { icon: LayoutGrid, label: "Panel", on: true },
    { icon: Briefcase, label: "Casos" },
    { icon: CalendarDays, label: "Agenda" },
    { icon: ListChecks, label: "Plazos" },
  ];
  return (
    <div className="flex text-left">
      <aside className="hidden w-44 shrink-0 border-r border-slate-100 p-3 md:block">
        {nav.map(({ icon: Icon, label, on }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] ${
              on ? "bg-brand-100/70 font-medium text-brand-700" : "text-slate-500"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </div>
        ))}
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Buenos días</p>
        <p className="text-xs text-slate-500">Esto es lo que tiene tu firma hoy</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            ["Casos activos", "24"],
            ["Citas hoy", "3"],
            ["Plazos vencidos", "1"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 p-3">
              <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900">{value}</div>
            </div>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {CASES.map((c, i) => (
            <li key={c.title} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${i > 2 ? "hidden sm:flex" : ""}`}>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-brand-700">{c.title}</div>
                <div className="text-[11px] text-slate-400">{c.who}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${c.tone}`}>{c.badge}</span>
            </li>
          ))}
        </ul>
      </div>
      <aside className="hidden w-56 shrink-0 border-l border-slate-100 p-4 lg:block">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Hoy</p>
        <div className="mt-3 space-y-2">
          {[
            ["09:00", "Carla Méndez", "Revisión de la demanda"],
            ["11:30", "Grupo Andes S.A.", "Firma de estatutos"],
          ].map(([time, who, what]) => (
            <div key={time} className="rounded-xl bg-brand-50 px-3 py-2.5">
              <div className="text-[11px] font-semibold tabular-nums text-brand-700">{time}</div>
              <div className="text-[12.5px] font-medium text-slate-900">{who}</div>
              <div className="text-[11px] text-slate-500">{what}</div>
            </div>
          ))}
          <div className="rounded-xl border border-red-200/70 bg-red-50/70 px-3 py-2.5">
            <div className="text-[11px] font-semibold text-red-700">Vence hoy</div>
            <div className="text-[12.5px] font-medium text-slate-900">Contestar demanda</div>
            <div className="text-[11px] text-slate-500">Accidente de tránsito</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ClientView() {
  const steps = [
    { label: "Solicitud", done: true },
    { label: "Aceptado", done: true },
    { label: "En curso", current: true },
    { label: "Resuelto" },
  ];
  return (
    <div className="grid gap-4 p-4 text-left sm:p-5 md:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Hola, Carla</p>
        <p className="text-xs text-slate-500">Así va tu caso</p>
        <div className="mt-4 rounded-xl border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-brand-700">Demanda laboral — despido</div>
              <div className="text-[11px] text-slate-400">Abogada: Ana Torres</div>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
              En curso
            </span>
          </div>
          <ol className="mt-4 grid grid-cols-4 gap-1">
            {steps.map((s) => (
              <li key={s.label} className="flex flex-col gap-1.5">
                <span
                  className={`h-1.5 rounded-full ${s.done ? "bg-brand-600" : s.current ? "bg-brand-300" : "bg-slate-100"}`}
                />
                <span className={`flex items-center gap-1 text-[10.5px] ${s.done || s.current ? "text-slate-700" : "text-slate-400"}`}>
                  {s.done && <Check className="h-3 w-3 text-brand-700" />}
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-3 hidden rounded-xl border border-slate-100 md:block">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Documentos compartidos
          </p>
          {["Demanda presentada.pdf", "Liquidación de haberes.pdf"].map((name) => (
            <div key={name} className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-slate-700">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-brand-50 p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-700">
            <CalendarDays className="h-3.5 w-3.5" />
            Próxima cita
          </div>
          <div className="mt-1 text-[13px] font-semibold text-slate-900">Lunes 09:00</div>
          <div className="text-[11px] text-slate-500">Revisión de la demanda · Presencial</div>
        </div>
        <div className="hidden rounded-xl border border-slate-100 p-3.5 md:block">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" />
            Mensajes
          </div>
          <div className="mt-2.5 max-w-[95%] rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2 text-[12px] leading-snug text-slate-700">
            Ya presentamos la demanda. Te aviso en cuanto haya fecha de audiencia.
          </div>
          <div className="ml-auto mt-2 w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-brand-600 px-3 py-2 text-[12px] leading-snug text-white">
            ¡Gracias! Te adjunto el contrato.
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1 text-[10.5px] text-slate-400">
            <Paperclip className="h-3 w-3" />
            Contrato de trabajo.pdf
          </div>
        </div>
      </div>
    </div>
  );
}
