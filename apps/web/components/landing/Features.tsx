import { ReactNode } from "react";
import { CalendarCheck, Check, ExternalLink, Mail, Scale } from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * Funcionalidades en tres capítulos (texto + un fragmento de la propia interfaz, con datos de
 * ejemplo) y una lista breve con lo demás. Todo lo que aparece existe en la aplicación.
 */
export function Features() {
  return (
    <>
      <div className="divide-y divide-slate-900/[0.08] border-t border-slate-900/[0.08]">
        <Chapter
          n="1"
          kicker="Términos y procesos"
          title="Los días hábiles se cuentan solos."
          text="Indica la fecha de notificación y los días del término: Bogados salta fines de semana y feriados y te da el vencimiento exacto. Los feriados nacionales ya vienen cargados; los locales y los traslados los añades tú."
          points={[
            "Vincula el número de proceso del SATJE a cada caso y ábrelo en la consulta de la Función Judicial con un clic.",
            "Lo vencido, lo de hoy y lo de esta semana, en tu panel al empezar el día.",
          ]}
        >
          <CaseFragment />
        </Chapter>
        <Chapter
          n="2"
          kicker="Clientes informados"
          title="Tu cliente sabe en qué va su caso sin tener que llamarte."
          text="Al cambiar el estado de un caso puedes avisarle por email, con una explicación en tus palabras. En su portal ve el estado, los documentos que compartes con él, tus mensajes y sus citas."
          points={[
            "El cliente también puede solicitar un caso nuevo desde el portal; tu firma decide si lo acepta y quién lo lleva.",
          ]}
        >
          <NoticeFragment />
        </Chapter>
        <Chapter
          n="3"
          kicker="Agenda"
          title="Citas sin llamadas ni dobles reservas."
          text="Publica tus horarios y deja que el cliente pida cita desde su portal. Si otra persona toma ese horario un instante antes, se le pide que elija otro."
          points={["Email al pedirla, al confirmarla o cancelarla, y un recordatorio antes de la cita."]}
        >
          <AgendaFragment />
        </Chapter>
      </div>

      <MoreList />
    </>
  );
}

function Chapter({
  n,
  kicker,
  title,
  text,
  points,
  children,
}: {
  n: string;
  kicker: string;
  title: string;
  text: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <article className="grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20">
      <Reveal>
        <p className="flex items-baseline gap-3 text-[13px] font-medium text-slate-500">
          <span className="font-display text-[1.375rem] font-normal tabular-nums leading-none text-red-700">{n}</span>
          {kicker}
        </p>
        <h3 className="mt-5 text-balance font-display text-[clamp(1.75rem,2.8vw,2.25rem)] font-normal leading-[1.12] tracking-[-0.018em] text-slate-900">
          {title}
        </h3>
        <p className="mt-4 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-slate-600">{text}</p>
        <ul className="mt-6 max-w-lg space-y-3 border-t border-slate-900/[0.08] pt-5">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-[0.875rem] leading-relaxed text-slate-600">
              <Check className="mt-[3px] h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120} className="min-w-0 lg:pt-2">
        <div aria-hidden className="pointer-events-none select-none">
          {children}
        </div>
      </Reveal>
    </article>
  );
}

/* ── Fragmentos de la interfaz (decorativos, datos de ejemplo) ─────────── */

const badge = "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium";

function CaseFragment() {
  const terms = [
    {
      task: "Contestar la demanda",
      detail: "3 días hábiles · notificado el 29 oct",
      due: "Vence jue 5 nov",
      tone: "bg-amber-100 text-amber-800",
    },
    {
      task: "Anunciar la prueba",
      detail: "10 días hábiles · notificado el 5 nov",
      due: "Vence jue 19 nov",
      tone: "bg-slate-100 text-slate-600",
    },
    {
      task: "Preparar la audiencia preliminar",
      detail: "Con la clienta, en el despacho",
      due: "Lun 23 nov",
      tone: "bg-slate-100 text-slate-600",
    },
  ];
  return (
    <div className="card overflow-hidden text-left">
      <div className="flex items-start justify-between gap-4 border-b border-slate-900/[0.06] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.006em] text-slate-900">Despido intempestivo</p>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">Carla Méndez · Laboral · Ana Torres</p>
        </div>
        <span className={`${badge} bg-emerald-100 text-emerald-800`}>Abierto</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.06] bg-slate-900/[0.02] px-5 py-3.5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">N.º de proceso (SATJE)</p>
          <p className="mt-0.5 font-mono text-[14px] tabular-nums text-slate-900">13284-2026-00412</p>
        </div>
        <span className="btn-secondary btn-sm">
          <ExternalLink className="h-3.5 w-3.5" />
          Copiar y abrir el SATJE
        </span>
      </div>

      <p className="px-5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Plazos</p>
      <ul className="divide-y divide-slate-900/[0.06] px-2 pb-2">
        {terms.map((t) => (
          <li key={t.task} className="flex min-h-[3.25rem] items-center gap-3 rounded-lg px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600/[0.08] text-brand-700">
              <Scale className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-slate-900">{t.task}</p>
              <p className="truncate text-[12px] text-slate-500">{t.detail}</p>
            </div>
            <span className={`${badge} ${t.tone} tabular-nums`}>{t.due}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoticeFragment() {
  return (
    <div className="flex flex-col gap-3 text-left sm:flex-row sm:items-start sm:gap-4">
      {/* El despacho cambia el estado y decide avisar */}
      <div className="card w-full p-4 sm:w-[18rem] sm:shrink-0">
        <p className="text-[13.5px] font-medium text-slate-900">Pasar a «Abierto»</p>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-brand-600 text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>
            Avisar a <span className="font-medium">Carla Méndez</span> por email
          </span>
        </p>
        <p className="mt-3 text-[11.5px] font-medium text-slate-500">Explicación para el cliente</p>
        <p className="mt-1 rounded-[10px] border border-slate-900/[0.12] bg-surface px-3 py-2 text-[12.5px] leading-snug text-slate-700">
          Presentamos la contestación. La audiencia preliminar es el lunes 23; te llamo antes para prepararla.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <span className="btn-secondary btn-sm">Cancelar</span>
          <span className="btn-primary btn-sm">Cambiar y avisar</span>
        </div>
      </div>

      {/* …y esto es lo que recibe la clienta */}
      <div className="min-w-0 flex-1 sm:mt-14">
        <p className="mb-2 hidden items-center gap-1.5 text-[12px] text-slate-500 sm:flex">
          <Mail className="h-3.5 w-3.5" />
          Lo que recibe la clienta
        </p>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-900/[0.06] px-5 pb-3 pt-4">
            <p className="text-[11.5px] text-slate-500">Torres Abogados · para Carla Méndez</p>
            <p className="mt-1 text-[13.5px] font-semibold leading-snug text-slate-900">
              Tu caso «Despido intempestivo» ahora está: Abierto
            </p>
          </div>
          <div className="space-y-3 px-5 py-4 text-[12.5px] leading-relaxed text-slate-600">
            <p>Tu caso está en trámite y tu abogado está trabajando en él.</p>
            <div className="rounded-md border-l-[3px] border-brand-600 bg-slate-900/[0.03] px-3 py-2 text-slate-700">
              <p>Estado: Ingreso → Abierto</p>
              <p>Abogado responsable: Ana Torres</p>
            </div>
            <span className="inline-flex rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white">
              Ver mi caso
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaFragment() {
  const days = [
    ["lun", "26"],
    ["mar", "27"],
    ["mié", "28"],
    ["jue", "29"],
    ["vie", "30"],
  ];
  const slots: [string, "free" | "taken" | "picked"][] = [
    ["09:00", "taken"],
    ["09:30", "free"],
    ["10:00", "picked"],
    ["10:30", "free"],
    ["11:00", "taken"],
    ["11:30", "free"],
    ["15:00", "free"],
    ["15:30", "taken"],
  ];
  return (
    <div className="card overflow-hidden text-left">
      <div className="flex items-center justify-between gap-4 border-b border-slate-900/[0.06] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.006em] text-slate-900">Pedir cita</p>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">Con Ana Torres · Despido intempestivo</p>
        </div>
        <span className={`${badge} bg-slate-100 text-slate-600`}>30 min</span>
      </div>
      <div className="px-5 py-4">
        <ol className="grid grid-cols-5 gap-2">
          {days.map(([dow, n]) => {
            const on = n === "27";
            return (
              <li
                key={n}
                className={`flex flex-col items-center rounded-[10px] border py-2 ${
                  on ? "border-brand-600 bg-brand-600/[0.06] text-brand-700" : "border-slate-900/[0.08] text-slate-600"
                }`}
              >
                <span className="text-[10.5px] uppercase tracking-[0.06em]">{dow}</span>
                <span className="font-display text-[1.125rem] tabular-nums leading-tight">{n}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[12px] text-slate-500">Martes 27 de octubre · hora del despacho</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {slots.map(([time, state]) => (
            <span
              key={time}
              className={`rounded-lg py-2 text-center text-[13px] font-medium tabular-nums ${
                state === "picked"
                  ? "bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)]"
                  : state === "taken"
                    ? "bg-slate-900/[0.04] text-slate-400 line-through"
                    : "border border-slate-900/[0.12] text-slate-700"
              }`}
            >
              {time}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2.5 border-t border-slate-900/[0.06] bg-slate-900/[0.02] px-5 py-3 text-[12.5px] text-slate-600">
        <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>
          <span className="font-medium text-slate-900">Cita solicitada</span> · te avisaremos cuando la confirmen
        </span>
      </div>
    </div>
  );
}

/* ── Lo demás, en una lista sobria ─────────── */

const MORE = [
  {
    title: "Documentos internos o compartidos",
    text: "Decides qué ve el cliente. Se descargan con permiso, nunca con un enlace público.",
  },
  {
    title: "Mensajes por caso",
    text: "La conversación con el cliente queda dentro de su expediente, no en un chat suelto.",
  },
  {
    title: "Notas e historial",
    text: "Notas internas del equipo y un registro de cada cambio del caso.",
  },
  {
    title: "Panel de la firma",
    text: "Casos por estado y por materia, carga por abogado y lo que vence hoy.",
  },
  {
    title: "Equipo y clientes",
    text: "Cada persona entra con su cuenta y ve solo lo que le corresponde.",
  },
  {
    title: "Avisos en la aplicación",
    text: "Cuando se pide o confirma una cita, llega una solicitud o se comparte un documento.",
  },
];

function MoreList() {
  return (
    <Reveal className="mt-4 rounded-[14px] border border-slate-900/[0.08] bg-surface/60 px-6 py-8 sm:px-8 lg:mt-6">
      <h3 className="font-display text-[1.375rem] font-normal tracking-[-0.015em] text-slate-900">Y en el día a día</h3>
      <ul className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {MORE.map((m) => (
          <li key={m.title} className="border-t border-slate-900/[0.08] pt-4">
            <p className="text-[0.9375rem] font-semibold tracking-[-0.006em] text-slate-900">{m.title}</p>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-slate-500">{m.text}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
