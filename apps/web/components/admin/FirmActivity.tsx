"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  MessageSquare,
  RotateCw,
  Settings2,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import {
  ACTIVITY_CATEGORY_LABEL,
  activityApiQuery,
  activityHref,
  categoryOf,
  hasActivityFilters,
  readActivityFilters,
  type ActivityCategory,
  type ActivityFilters,
  type FirmActivityItem,
  type FirmActivityResponse,
} from "@/lib/firm-activity";
import { EmptyState, FormMessage, Spinner, errorMessage } from "@/components/ui";
import type { FirmUser } from "@/components/admin/LoginActivity";

const PAGE_SIZE = 25;

const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  casos: Briefcase,
  documentos: FileText,
  notas: StickyNote,
  mensajes: MessageSquare,
  citas: CalendarDays,
  usuarios: Users,
  ajustes: Settings2,
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", ABOGADO: "Abogado", CLIENTE: "Cliente" };

const chip = (active: boolean) =>
  `inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    active
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-slate-200 bg-surface text-slate-700 hover:border-brand-500 hover:text-brand-700"
  }`;

/**
 * Actividad de toda la firma (GET /activity). Filtros y página viven en la URL
 * (?grupo=&persona=&desde=&hasta=&pagina=) para poder compartir o recargar la vista.
 */
export function FirmActivity({ timeZone, users }: { timeZone: string; users: FirmUser[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const personId = useId();
  const fromId = useId();
  const toId = useId();

  const userIds = useMemo(() => users.map((u) => u.id), [users]);
  const filters = readActivityFilters(searchParams, userIds);
  const { category, actorId, from, to, page } = filters;

  const [data, setData] = useState<FirmActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    nestFetch<FirmActivityResponse>(`/activity?${activityApiQuery({ category, actorId, from, to, page }, PAGE_SIZE)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) setData(res);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err, "No se pudo cargar la actividad de la firma."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, actorId, from, to, page, attempt]);

  /** Cambiar un filtro vuelve a la página 1; cambiar de página conserva los filtros. */
  function navigate(next: Partial<ActivityFilters>) {
    router.replace(activityHref(pathname, { ...filters, page: 1, ...next }), { scroll: false });
  }

  const filtered = hasActivityFilters(filters);
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const team = users.filter((u) => u.role !== "CLIENTE");
  const clients = users.filter((u) => u.role === "CLIENTE");
  const days = useMemo(() => groupByDay(data?.items ?? [], timeZone), [data, timeZone]);

  return (
    <section className="card overflow-hidden" aria-labelledby="firm-activity-title">
      <div className="card-header">
        <h2 id="firm-activity-title" className="card-title">
          Registro de actividad
        </h2>
        {loading && data && <Spinner className="h-4 w-4 text-slate-400" />}
      </div>

      <div className="card-body space-y-4 border-b border-slate-100">
        <nav aria-label="Filtrar por tipo de actividad" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate({ category: "" })}
            className={chip(category === "")}
            aria-current={category === "" ? "true" : undefined}
          >
            Todo
          </button>
          {(Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => navigate({ category: c })}
              className={chip(category === c)}
              aria-current={category === c ? "true" : undefined}
            >
              {ACTIVITY_CATEGORY_LABEL[c]}
            </button>
          ))}
        </nav>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <label htmlFor={personId} className="mb-1 block text-xs font-medium text-slate-600">
              Persona
            </label>
            <select
              id={personId}
              value={actorId}
              onChange={(e) => navigate({ actorId: e.target.value })}
              className="input py-1.5"
            >
              <option value="">Todas las personas</option>
              {team.length > 0 && (
                <optgroup label="Equipo">
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {clients.length > 0 && (
                <optgroup label="Clientes">
                  {clients.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label htmlFor={fromId} className="mb-1 block text-xs font-medium text-slate-600">
              Desde
            </label>
            <input
              id={fromId}
              type="date"
              value={from}
              min="2000-01-01"
              max={to || "2100-12-31"}
              onChange={(e) => navigate({ from: e.target.value })}
              className="input py-1.5 sm:w-40"
            />
          </div>
          <div>
            <label htmlFor={toId} className="mb-1 block text-xs font-medium text-slate-600">
              Hasta
            </label>
            <input
              id={toId}
              type="date"
              value={to}
              min={from || "2000-01-01"}
              max="2100-12-31"
              onChange={(e) => navigate({ to: e.target.value })}
              className="input py-1.5 sm:w-40"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
        <p aria-live="polite" className="text-xs text-slate-500">
          {data && !error
            ? `${total} ${total === 1 ? "acción" : "acciones"}${filtered ? " con estos filtros" : ""}`
            : ""}
        </p>
        {filtered && (
          <Link href={pathname} replace scroll={false} className="text-xs font-medium text-brand-700 hover:underline">
            Quitar filtros
          </Link>
        )}
      </div>

      {error ? (
        <div className="space-y-3 p-4 sm:px-5">
          <FormMessage type="error">{error}</FormMessage>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-secondary btn-sm">
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            Reintentar
          </button>
        </div>
      ) : !data ? (
        <RowsSkeleton />
      ) : data.items.length === 0 ? (
        total > 0 && page > 1 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">Esta página ya no tiene registros</p>
            <button type="button" onClick={() => navigate({ page: totalPages })} className="btn-secondary btn-sm mt-3">
              Ir a la última página
            </button>
          </div>
        ) : filtered ? (
          <EmptyState
            icon={History}
            title="No hay actividad con estos filtros"
            hint="Prueba con otro tipo, otra persona u otras fechas."
            action={{ href: pathname, label: "Quitar filtros" }}
          />
        ) : (
          <EmptyState
            icon={History}
            title="Aún no hay actividad registrada"
            hint="Aquí verás cada caso, documento, cita o cambio de usuarios y ajustes, con quién lo hizo y cuándo."
          />
        )
      ) : (
        <div aria-busy={loading} className={`mt-2 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {days.map((day) => (
            <section key={day.key} aria-label={day.label}>
              <h3 className="sticky top-0 z-[1] border-y border-slate-100 bg-slate-50/95 px-4 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur sm:px-5">
                {day.label}
              </h3>
              <ul className="divide-y divide-slate-100">
                {day.items.map((ev) => (
                  <ActivityRow key={ev.id} ev={ev} timeZone={timeZone} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {data && !error && totalPages > 1 && data.items.length > 0 && (
        <nav
          aria-label="Paginación de la actividad"
          className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm sm:px-5"
        >
          <button
            type="button"
            onClick={() => navigate({ page: page - 1 })}
            disabled={page <= 1 || loading}
            className="btn-secondary btn-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Anterior
          </button>
          <span className="text-xs tabular-nums text-slate-500">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => navigate({ page: page + 1 })}
            disabled={page >= totalPages || loading}
            className="btn-secondary btn-sm"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </nav>
      )}
    </section>
  );
}

function ActivityRow({ ev, timeZone }: { ev: FirmActivityItem; timeZone: string }) {
  const category = categoryOf(ev.type);
  const Icon = category ? CATEGORY_ICON[category] : History;
  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-slate-900/[0.02] sm:px-5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 break-words text-sm text-slate-900">{ev.summary}</p>
          <time dateTime={ev.createdAt} className="shrink-0 text-xs tabular-nums text-slate-500">
            {formatTime(ev.createdAt, timeZone)}
          </time>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span>
            {ev.actor ? (
              <>
                {ev.actor.name}
                <span className="text-slate-400"> · {ROLE_LABEL[ev.actor.role] ?? ev.actor.role}</span>
              </>
            ) : (
              "Sistema"
            )}
          </span>
          {category && (
            <>
              <span aria-hidden>·</span>
              <span>{ACTIVITY_CATEGORY_LABEL[category]}</span>
            </>
          )}
          {ev.case && (
            <>
              <span aria-hidden>·</span>
              <Link href={`/casos/${ev.case.id}`} className="min-w-0 truncate font-medium text-brand-700 hover:underline">
                {ev.case.title}
              </Link>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

/** Agrupa por día en la hora de la firma, manteniendo el orden (más reciente primero). */
function groupByDay(items: FirmActivityItem[], timeZone: string) {
  const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const labelFmt = new Intl.DateTimeFormat("es-EC", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const days: { key: string; label: string; items: FirmActivityItem[] }[] = [];
  for (const ev of items) {
    const at = new Date(ev.createdAt);
    const key = keyFmt.format(at);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(ev);
    else {
      // «Miércoles, 11 de noviembre de 2026»: solo la primera letra en mayúscula
      const label = labelFmt.format(at);
      days.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [ev] });
    }
  }
  return days;
}

function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-EC", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(iso),
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:px-5" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-7 w-7 shrink-0 rounded-lg" />
          <div className="skeleton h-4 flex-1" />
          <div className="skeleton h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Esqueleto para el Suspense de la página, mientras se hidratan los filtros de la URL. */
export function FirmActivitySkeleton() {
  return (
    <section className="card overflow-hidden" aria-busy="true" aria-label="Cargando actividad de la firma">
      <div className="card-header">
        <div className="skeleton h-5 w-48" />
      </div>
      <div className="card-body space-y-4 border-b border-slate-100">
        <div className="flex flex-wrap gap-2">
          {[14, 16, 24, 16, 20, 14, 18, 16].map((w, i) => (
            <div key={i} className="skeleton h-7 rounded-full" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        <div className="skeleton h-9 w-full" />
      </div>
      <RowsSkeleton />
    </section>
  );
}
