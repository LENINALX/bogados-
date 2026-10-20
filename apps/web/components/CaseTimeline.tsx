"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  BadgeCheck,
  Circle,
  Clock,
  FileText,
  FolderPlus,
  Gavel,
  History,
  Inbox,
  Lock,
  Mail,
  MessageSquareText,
  Repeat2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { TimelineItem } from "@/lib/timeline";
import { EmptyState } from "./ui";
import { Badge } from "./staff/primitives";

/** Marcador de cada tipo: icono lucide sobre un círculo tintado con el tono de la paleta. */
type Marker = { icon: LucideIcon; tone: string; label: string };

const TONE = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
} as const;

const EVENT_STYLE: Record<string, Marker> = {
  CASE_CREATED: { icon: FolderPlus, tone: TONE.brand, label: "Caso creado" },
  STATUS_CHANGED: { icon: Repeat2, tone: TONE.emerald, label: "Cambio de estado" },
  ASSIGNED: { icon: UserCheck, tone: TONE.sky, label: "Asignación" },
  DOC_UPLOADED: { icon: FileText, tone: TONE.slate, label: "Documento" },
  PROCESS_LINKED: { icon: Gavel, tone: TONE.brand, label: "Proceso judicial" },
  CASE_REQUESTED: { icon: Inbox, tone: TONE.amber, label: "Solicitud" },
  CASE_ACCEPTED: { icon: BadgeCheck, tone: TONE.emerald, label: "Solicitud aceptada" },
  CASE_POSTPONED: { icon: Clock, tone: TONE.amber, label: "Solicitud aplazada" },
  CASE_REJECTED: { icon: Ban, tone: TONE.red, label: "Solicitud rechazada" },
};
const DEFAULT_EVENT: Marker = { icon: Circle, tone: TONE.slate, label: "Evento" };
const NOTE_INTERNAL: Marker = { icon: Lock, tone: TONE.amber, label: "Nota interna" };
const NOTE_PUBLIC: Marker = { icon: MessageSquareText, tone: TONE.emerald, label: "Nota" };

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

function MarkerDot({ marker }: { marker: Marker }) {
  const Icon = marker.icon;
  return (
    <span
      className={`absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-inset ${marker.tone}`}
      aria-hidden
    >
      {/* Anillo del color de la tarjeta: corta la línea de tiempo alrededor del marcador */}
      <span className="absolute -inset-[3px] -z-10 rounded-full bg-surface" />
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}

function EmailedBadge() {
  return (
    <Badge tone="slate" icon={Mail}>
      Avisado por email
    </Badge>
  );
}

type Filter = "all" | "note" | "event";

export function CaseTimeline({
  title = "Timeline del caso",
  items,
  showFilters = true,
  audience = "staff",
}: {
  title?: string;
  items: TimelineItem[];
  showFilters?: boolean;
  /** En el portal no se muestra la etiqueta de visibilidad (todas son públicas). */
  audience?: "staff" | "client";
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () =>
      items
        .filter((i) => filter === "all" || i.kind === filter)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [items, filter],
  );

  const counts = {
    all: items.length,
    note: items.filter((i) => i.kind === "note").length,
    event: items.filter((i) => i.kind === "event").length,
  };

  return (
    <section className="card">
      <div className="card-header flex-wrap">
        <h2 className="card-title flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" aria-hidden />
          {title}
        </h2>
        {showFilters && (
          <div role="group" aria-label="Filtrar actividad" className="flex gap-0.5 rounded-lg bg-slate-900/[0.04] p-0.5 text-xs">
            {(
              [
                ["all", "Todo"],
                ["note", "Notas"],
                ["event", "Eventos"],
              ] as [Filter, string][]
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-[background-color,color,box-shadow] duration-150 ${
                  filter === f
                    ? "bg-surface text-slate-900 shadow-[0_1px_2px_rgb(23_21_17/0.08)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
                <span className="tabular-nums text-slate-400">{counts[f]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[34rem] overflow-y-auto px-4 py-5 sm:px-5">
        {sorted.length === 0 ? (
          <EmptyState
            icon={History}
            title={filter === "note" ? "Sin notas" : filter === "event" ? "Sin eventos" : "Sin actividad todavía"}
            hint={
              audience === "client"
                ? "Aquí verás cada avance de tu caso."
                : "Las notas, cambios de estado y documentos quedarán registrados aquí."
            }
          />
        ) : (
          <ol className="relative isolate">
            {/* Línea vertical que une los marcadores */}
            <span className="absolute bottom-3 left-[13.5px] top-3 -z-20 w-px bg-slate-900/[0.1]" aria-hidden />
            {sorted.map((item) => {
              const date = new Date(item.createdAt).toLocaleString("es-EC", DATE_FORMAT);
              if (item.kind === "note") {
                return (
                  <li key={`n-${item.id}`} className="relative pb-6 pl-11 last:pb-0">
                    <MarkerDot marker={item.isInternal ? NOTE_INTERNAL : NOTE_PUBLIC} />
                    <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-800">{item.author}</span>
                      {audience === "staff" && (
                        <Badge tone={item.isInternal ? "amber" : "emerald"}>
                          {item.isInternal ? "Nota interna" : "Visible al cliente"}
                        </Badge>
                      )}
                      {audience === "staff" && item.emailedClient && <EmailedBadge />}
                      <time dateTime={item.createdAt} className="ml-auto tabular-nums">
                        {date}
                      </time>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap rounded-[10px] border border-slate-900/[0.06] bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800">
                      {item.body}
                    </p>
                  </li>
                );
              }
              const style = EVENT_STYLE[item.type] ?? DEFAULT_EVENT;
              return (
                <li key={`e-${item.id}`} className="relative pb-6 pl-11 last:pb-0">
                  <MarkerDot marker={style} />
                  <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{style.label}</span>
                    {item.actor && <span>· {item.actor}</span>}
                    {audience === "staff" && item.emailedClient && <EmailedBadge />}
                    <time dateTime={item.createdAt} className="ml-auto tabular-nums">
                      {date}
                    </time>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-900">{item.summary}</p>
                  {item.detail && (
                    <div className="mt-2 rounded-[10px] border border-slate-900/[0.06] bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-medium text-brand-700">
                        {audience === "client" ? "Mensaje de tu abogado" : "Explicación para el cliente"}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.detail}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
