import { ReactNode } from "react";
import { Bell, CalendarCheck, FileLock, FileText, Lock, Users } from "lucide-react";
import { Reveal } from "./Reveal";

/** Cada funcionalidad se explica con un fragmento de la propia interfaz (decorativo). */
export function FeatureBento() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Tile className="md:col-span-4" title="Expedientes ordenados" text="Cada caso con su estado, responsable, notas internas y un historial de todo lo que pasa.">
        <CaseTimeline />
      </Tile>
      <Tile className="md:col-span-2" delay={80} title="Portal del cliente" text="Tus clientes ven el avance y te escriben sin depender del correo.">
        <Chat />
      </Tile>
      <Tile className="md:col-span-2" title="Citas sin dobles reservas" text="Publica tu disponibilidad y deja que pidan cita. Recordatorio automático.">
        <Slots />
      </Tile>
      <Tile className="md:col-span-2" delay={80} title="Documentos privados" text="Internos o compartidos con el cliente, siempre con control de acceso.">
        <Documents />
      </Tile>
      <Tile className="md:col-span-2" delay={160} title="Plazos bajo control" text="Lo vencido, lo de hoy y lo de esta semana, de un vistazo.">
        <Deadlines />
      </Tile>
      <Tile className="md:col-span-3" title="Avisos al momento" text="Notificación y email cuando cambia un estado, llega un mensaje o se confirma una cita.">
        <Notifications />
      </Tile>
      <Tile className="md:col-span-3" delay={80} title="Tu firma en números" text="Casos por estado, carga por abogado y citas de la semana en el panel.">
        <Bars />
      </Tile>
    </div>
  );
}

function Tile({
  title,
  text,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  text: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal
      as="article"
      delay={delay}
      className={`lift flex min-h-[19rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-surface p-6 sm:p-7 ${className}`}
    >
      <h3 className="text-[1.1875rem] font-semibold leading-snug tracking-[-0.017em] text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-[0.9375rem] leading-relaxed text-slate-500">{text}</p>
      <div aria-hidden className="lift-visual mt-auto pt-6">
        {children}
      </div>
    </Reveal>
  );
}

function CaseTimeline() {
  const events = [
    { when: "Hoy, 10:42", what: "Estado cambiado a", strong: "En curso", dot: "bg-emerald-500" },
    { when: "Ayer, 17:05", what: "Documento subido:", strong: "poder-especial.pdf", dot: "bg-brand-600" },
    { when: "Lun, 09:20", what: "Nota interna de", strong: "Ana Torres", dot: "bg-slate-300" },
  ];
  return (
    <ol className="relative space-y-3.5 border-l border-slate-200 pl-5">
      {events.map((e) => (
        <li key={e.when} className="relative">
          <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${e.dot}`} />
          <p className="text-[13px] text-slate-600">
            {e.what} <span className="font-medium text-slate-900">{e.strong}</span>
          </p>
          <p className="text-[11px] tabular-nums text-slate-400">{e.when}</p>
        </li>
      ))}
    </ol>
  );
}

function Chat() {
  return (
    <div className="space-y-2">
      <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-[13px] leading-snug text-slate-700">
        ¿Hay novedades de mi caso?
      </div>
      <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-tr-md bg-brand-600 px-3.5 py-2 text-[13px] leading-snug text-white">
        Sí, ya está en curso. Te subí el escrito al portal.
      </div>
    </div>
  );
}

function Slots() {
  const slots: [string, "free" | "taken" | "picked"][] = [
    ["09:00", "taken"],
    ["09:30", "picked"],
    ["10:00", "free"],
    ["10:30", "free"],
    ["11:00", "taken"],
    ["11:30", "free"],
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map(([time, state]) => (
          <span
            key={time}
            className={`rounded-xl px-2 py-2 text-center text-[13px] font-medium tabular-nums ${
              state === "picked"
                ? "bg-brand-600 text-white"
                : state === "taken"
                  ? "bg-slate-100 text-slate-400 line-through"
                  : "border border-slate-200 text-slate-700"
            }`}
          >
            {time}
          </span>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
        <CalendarCheck className="h-3.5 w-3.5" />
        Cita confirmada · Lunes 09:30
      </p>
    </div>
  );
}

function Documents() {
  const docs = [
    { name: "Estrategia de defensa.docx", icon: Lock, label: "Interno", tone: "text-slate-500 bg-slate-100" },
    { name: "Demanda presentada.pdf", icon: Users, label: "Cliente", tone: "text-brand-700 bg-brand-50" },
    { name: "Poder especial.pdf", icon: Users, label: "Cliente", tone: "text-brand-700 bg-brand-50" },
  ];
  return (
    <ul className="space-y-2">
      {docs.map(({ name, icon: Icon, label, tone }) => (
        <li key={name} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-700">{name}</span>
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
            <Icon className="h-3 w-3" />
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Deadlines() {
  const items = [
    { task: "Contestar demanda", badge: "Vencido", tone: "bg-red-100 text-red-700" },
    { task: "Enviar liquidación", badge: "Hoy", tone: "bg-amber-100 text-amber-800" },
    { task: "Preparar audiencia", badge: "Jueves", tone: "bg-slate-100 text-slate-600" },
  ];
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.task} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
          <span className="truncate text-[12.5px] text-slate-700">{i.task}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${i.tone}`}>{i.badge}</span>
        </li>
      ))}
    </ul>
  );
}

function Notifications() {
  // Pila con profundidad: cada aviso más antiguo queda detrás, más pequeño y tenue
  const items = [
    { icon: Bell, title: "Nuevo mensaje de Carla Méndez", text: "¡Gracias! Te adjunto el contrato." },
    { icon: CalendarCheck, title: "Cita confirmada", text: "Lunes 09:30 con Jorge Paz" },
    { icon: FileLock, title: "Documento compartido", text: "Demanda presentada.pdf" },
  ];
  return (
    <div className="relative mx-auto h-[8.5rem] max-w-sm">
      {items.map(({ icon: Icon, title, text }, i) => (
        <div
          key={title}
          className="absolute inset-x-0 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-surface px-3.5 py-3 shadow-lg shadow-slate-900/[0.06]"
          style={{
            top: `${i * 14}px`,
            transform: `scale(${1 - i * 0.05})`,
            opacity: 1 - i * 0.3,
            zIndex: items.length - i,
          }}
        >
          {/* Los avisos de detrás solo asoman el borde: su contenido no compite con el de delante */}
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white ${i ? "invisible" : ""}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className={`min-w-0 ${i ? "invisible" : ""}`}>
            <span className="block truncate text-[13px] font-semibold text-slate-900">{title}</span>
            <span className="block truncate text-[12px] text-slate-500">{text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Bars() {
  const data = [
    ["Nuevos", 38],
    ["En curso", 82],
    ["Revisión", 54],
    ["Cerrados", 66],
  ] as const;
  return (
    <div className="flex h-32 items-end gap-3">
      {data.map(([label, value], i) => (
        <div key={label} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-lg ${i === 1 ? "bg-brand-600" : "bg-brand-200"}`}
              style={{ height: `${value}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
