"use client";

import { useEffect, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { formatLoginDate, loginReasonLabel, type LoginEvent } from "@/lib/login-events";
import { EmptyState, FormMessage, Spinner, errorMessage } from "@/components/ui";

const PAGE_SIZE = 20;
/** A partir de cuántos fallos en 24 h el resumen pasa de ámbar a rojo */
const FAILED_ALERT_THRESHOLD = 5;

type ResultFilter = "" | "success" | "failed";
type LoginEventsResponse = {
  items: LoginEvent[];
  meta: { total: number; page: number; pageSize: number };
  failedLast24h: number;
};
export type FirmUser = { id: string; name: string; role: string };

/** Valores del filtro en la URL (en español) ↔ valores de la API */
const RESULT_PARAM: Record<Exclude<ResultFilter, "">, string> = { success: "correctos", failed: "fallidos" };
const RESULT_CHIPS: { value: ResultFilter; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "success", label: "Correctos" },
  { value: "failed", label: "Fallidos" },
];

function readResult(v: string | null): ResultFilter {
  return v === "correctos" ? "success" : v === "fallidos" ? "failed" : "";
}

const chip = (active: boolean) =>
  `inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    active
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-slate-200 bg-surface text-slate-700 hover:border-brand-500 hover:text-brand-700"
  }`;

/**
 * Registro de inicios de sesión de la firma (GET /auth/login-events).
 * Filtros y página viven en la URL (?resultado=&usuario=&pagina=) para poder compartir o recargar la vista.
 */
export function LoginActivity({ timeZone, users }: { timeZone: string; users: FirmUser[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectId = useId();

  const result = readResult(searchParams.get("resultado"));
  const requestedUser = searchParams.get("usuario") ?? "";
  const userId = users.some((u) => u.id === requestedUser) ? requestedUser : "";
  const page = Math.max(1, Number.parseInt(searchParams.get("pagina") ?? "", 10) || 1);

  const [data, setData] = useState<LoginEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    // Los filtros vacíos no se envían: la API rechaza `result=` vacío
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (result) qs.set("result", result);
    if (userId) qs.set("userId", userId);
    nestFetch<LoginEventsResponse>(`/auth/login-events?${qs}`, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setData(res);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err, "No se pudo cargar el registro de accesos."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [result, userId, page, attempt]);

  /** Cambiar un filtro vuelve a la página 1; cambiar de página conserva los filtros. */
  function navigate(next: { result?: ResultFilter; userId?: string; page?: number }) {
    const merged = { result, userId, page: 1, ...next };
    const sp = new URLSearchParams();
    if (merged.result) sp.set("resultado", RESULT_PARAM[merged.result]);
    if (merged.userId) sp.set("usuario", merged.userId);
    if (merged.page > 1) sp.set("pagina", String(merged.page));
    const s = sp.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const filtered = Boolean(result || userId);
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const team = users.filter((u) => u.role !== "CLIENTE");
  const clients = users.filter((u) => u.role === "CLIENTE");

  return (
    <section className="card overflow-hidden" aria-labelledby="login-activity-title">
      <div className="card-header">
        <h2 id="login-activity-title" className="card-title">
          Registro de inicios de sesión
        </h2>
        {loading && data && <Spinner className="h-4 w-4 text-slate-400" />}
      </div>

      <div className="card-body space-y-4 border-b border-slate-100">
        <FailedSummary
          count={data?.failedLast24h ?? null}
          showLink={result !== "failed"}
          onShowFailed={() => navigate({ result: "failed", userId })}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Filtrar por resultado" className="flex flex-wrap gap-2">
            {RESULT_CHIPS.map((c) => (
              <button
                key={c.value || "all"}
                type="button"
                onClick={() => navigate({ result: c.value, userId })}
                className={chip(result === c.value)}
                aria-current={result === c.value ? "true" : undefined}
              >
                {c.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="shrink-0 text-xs font-medium text-slate-600">
              Persona
            </label>
            <select
              id={selectId}
              value={userId}
              onChange={(e) => navigate({ result, userId: e.target.value })}
              className="input py-1.5 md:w-64"
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
        </div>
      </div>

      <p aria-live="polite" className="px-4 pt-3 text-xs text-slate-500 sm:px-5">
        {data && !error
          ? `${total} ${total === 1 ? "intento de acceso" : "intentos de acceso"}${filtered ? " con estos filtros" : ""}`
          : ""}
      </p>

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
            <button
              type="button"
              onClick={() => navigate({ result, userId, page: totalPages })}
              className="btn-secondary btn-sm mt-3"
            >
              Ir a la última página
            </button>
          </div>
        ) : filtered ? (
          <EmptyState
            title="No hay accesos con estos filtros"
            hint="Prueba con otro resultado u otra persona."
            action={{ href: pathname, label: "Quitar filtros" }}
          />
        ) : (
          <EmptyState
            title="Aún no hay inicios de sesión registrados"
            hint="Aquí aparecerá cada intento de entrar a la firma, correcto o fallido."
          />
        )
      ) : (
        <div aria-busy={loading} className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* Móvil: lista apilada */}
          <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100 md:hidden">
            {data.items.map((ev) => (
              <li key={ev.id} className={`px-4 py-3 ${ev.success ? "" : "bg-red-50/70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <Person ev={ev} />
                  <ResultBadge success={ev.success} />
                </div>
                <p className={`mt-1.5 text-xs font-medium ${ev.success ? "text-slate-600" : "text-red-700"}`}>
                  {loginReasonLabel(ev.reason)}
                </p>
                <p className="mt-0.5 break-words text-xs text-slate-500">
                  <time dateTime={ev.createdAt}>{formatLoginDate(ev.createdAt, timeZone)}</time>
                  {" · "}
                  <span title={ev.userAgent ?? undefined}>{ev.device}</span>
                  {" · "}
                  <span className="break-all font-mono">{ev.ip ?? "IP desconocida"}</span>
                </p>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="mt-2 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Fecha</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Persona</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Resultado</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Motivo</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Dispositivo</th>
                  <th scope="col" className="px-5 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((ev) => (
                  <tr key={ev.id} className={ev.success ? "transition hover:bg-slate-50" : "bg-red-50/70"}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                      <time dateTime={ev.createdAt}>{formatLoginDate(ev.createdAt, timeZone)}</time>
                    </td>
                    <td className="px-5 py-3">
                      <Person ev={ev} />
                    </td>
                    <td className="px-5 py-3">
                      <ResultBadge success={ev.success} />
                    </td>
                    <td className={`px-5 py-3 ${ev.success ? "text-slate-600" : "font-medium text-red-700"}`}>
                      {loginReasonLabel(ev.reason)}
                    </td>
                    <td className="px-5 py-3 text-slate-600" title={ev.userAgent ?? undefined}>
                      {ev.device}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">{ev.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && !error && totalPages > 1 && data.items.length > 0 && (
        <nav
          aria-label="Paginación de accesos"
          className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm sm:px-5"
        >
          <button
            type="button"
            onClick={() => navigate({ result, userId, page: page - 1 })}
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
            onClick={() => navigate({ result, userId, page: page + 1 })}
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

/** Intentos fallidos de toda la firma en las últimas 24 h (no depende de los filtros). */
function FailedSummary({
  count,
  showLink,
  onShowFailed,
}: {
  count: number | null;
  showLink: boolean;
  onShowFailed: () => void;
}) {
  if (count === null) return <div className="skeleton h-12 w-full" aria-hidden />;

  if (count === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
        Ningún intento fallido en las últimas 24 horas.
      </p>
    );
  }

  const severe = count >= FAILED_ALERT_THRESHOLD;
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
        severe ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="text-sm">
          <p>
            <strong className="font-semibold tabular-nums">
              {count} {count === 1 ? "intento fallido" : "intentos fallidos"}
            </strong>{" "}
            en las últimas 24 horas
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            Si se repiten con el mismo email o desde la misma IP, alguien podría estar intentando adivinar una contraseña.
          </p>
        </div>
      </div>
      {showLink && (
        <button type="button" onClick={onShowFailed} className="btn-secondary btn-sm shrink-0 self-start sm:self-auto">
          Ver fallidos
        </button>
      )}
    </div>
  );
}

/** Nombre y email; si el email no corresponde a ninguna cuenta, el email se muestra igual de visible. */
function Person({ ev }: { ev: LoginEvent }) {
  if (!ev.user) {
    return (
      <div className="min-w-0">
        <div className="break-all font-medium text-slate-800">{ev.email}</div>
        <div className="text-xs text-slate-500">Sin cuenta en la firma</div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="font-medium text-slate-800">{ev.user.name}</div>
      <div className="break-all text-xs text-slate-500">{ev.email}</div>
    </div>
  );
}

function ResultBadge({ success }: { success: boolean }) {
  return success ? (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      Correcto
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
      <XCircle className="h-3.5 w-3.5" aria-hidden />
      Fallido
    </span>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:px-5" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton h-4 w-28 shrink-0" />
          <div className="skeleton h-4 flex-1" />
          <div className="skeleton h-5 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Esqueleto para el Suspense de la página, mientras se hidratan los filtros de la URL. */
export function LoginActivitySkeleton() {
  return (
    <section className="card overflow-hidden" aria-busy="true" aria-label="Cargando registro de accesos">
      <div className="card-header">
        <div className="skeleton h-5 w-56" />
      </div>
      <div className="card-body space-y-4 border-b border-slate-100">
        <div className="skeleton h-12 w-full" />
        <div className="flex flex-wrap gap-2">
          <div className="skeleton h-7 w-16 rounded-full" />
          <div className="skeleton h-7 w-24 rounded-full" />
          <div className="skeleton h-7 w-20 rounded-full" />
        </div>
      </div>
      <RowsSkeleton />
    </section>
  );
}
