"use client";

import { useMemo, useState } from "react";
import type { TimelineItem } from "@/lib/timeline";

const EVENT_STYLE: Record<string, { dot: string; icon: string; label: string }> = {
  CASE_CREATED: { dot: "bg-brand-700", icon: "+", label: "Caso creado" },
  STATUS_CHANGED: { dot: "bg-blue-600", icon: "↻", label: "Cambio de estado" },
  ASSIGNED: { dot: "bg-violet-600", icon: "→", label: "Asignación" },
  DOC_UPLOADED: { dot: "bg-slate-500", icon: "▤", label: "Documento" },
};
const DEFAULT_EVENT = { dot: "bg-slate-400", icon: "•", label: "Evento" };

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
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {showFilters && (
          <div className="flex gap-1 text-xs">
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
                className={`rounded-full px-2.5 py-0.5 font-medium ${
                  filter === f ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label} ({counts[f]})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[32rem] overflow-y-auto px-4 py-4">
        {sorted.length === 0 && <p className="py-4 text-sm text-slate-400">Sin actividad</p>}
        <ol className="relative ml-3 border-l border-slate-200">
          {sorted.map((item) => {
            const date = new Date(item.createdAt).toLocaleString("es-EC");
            if (item.kind === "note") {
              return (
                <li key={`n-${item.id}`} className="relative mb-5 pl-6 last:mb-0">
                  <span
                    className={`absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] text-white ring-4 ring-white ${
                      item.isInternal ? "bg-amber-500" : "bg-emerald-600"
                    }`}
                    aria-hidden
                  >
                    ✎
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{item.author}</span>
                    {audience === "staff" && (
                      <span
                        className={`rounded px-1.5 ${
                          item.isInternal ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.isInternal ? "Nota interna" : "Visible al cliente"}
                      </span>
                    )}
                    <span className="ml-auto">{date}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    {item.body}
                  </p>
                </li>
              );
            }
            const style = EVENT_STYLE[item.type] ?? DEFAULT_EVENT;
            return (
              <li key={`e-${item.id}`} className="relative mb-5 pl-6 last:mb-0">
                <span
                  className={`absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] text-white ring-4 ring-white ${style.dot}`}
                  aria-hidden
                >
                  {style.icon}
                </span>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{style.label}</span>
                  {item.actor && <span>· {item.actor}</span>}
                  <span className="ml-auto">{date}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-700">{item.summary}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
