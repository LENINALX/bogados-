import Link from "next/link";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";
import { STATUS_SERIES_COLOR, STATUS_SERIES_INK } from "@/lib/viz";
import { formatAverageDuration } from "@/lib/stats";
import { casesByStatusHref } from "@/lib/nav";

/** Tooltip CSS (hover + foco de teclado); el padre debe ser `group relative`. */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-50 opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} aria-hidden />;
}

/** Cabecera común de las gráficas: título a la izquierda, contexto a la derecha. */
function ChartHeader({
  title,
  meta,
  as: Tag = "h3",
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  as?: "h2" | "h3";
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Tag className="card-title">{title}</Tag>
        {meta && <span className="text-xs tabular-nums text-slate-500">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] border border-dashed border-slate-900/[0.1] px-4 py-8 text-center text-[13px] text-slate-500">
      {children}
    </p>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "critical";
  href?: string;
}) {
  const alert = tone === "critical" && value > 0;
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-1.5 text-[13px] font-medium ${alert ? "text-red-700" : "text-slate-600"}`}>
          {alert && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
          {label}
        </span>
        {href && (
          <ArrowUpRight
            className="h-4 w-4 text-slate-400 transition-[color,transform] duration-150 group-hover:text-brand-700 motion-safe:group-hover:-translate-y-px motion-safe:group-hover:translate-x-px"
            aria-hidden
          />
        )}
      </div>
      <div
        className={`mt-4 font-display text-[2.625rem] font-normal leading-none tracking-[-0.02em] tabular-nums ${
          alert ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className={`mt-2 min-h-4 text-xs ${alert ? "text-red-700" : "text-slate-500"}`}>
        {hint ?? (alert ? "Requieren atención" : tone === "critical" ? "Todo al día" : "")}
      </div>
    </>
  );
  const cls = `card group block p-4 sm:p-5 ${alert ? "border-red-200 bg-red-50/50" : ""} ${
    href
      ? "transition-[border-color,box-shadow,transform] duration-150 [transition-timing-function:var(--ease-premium)] hover:border-slate-900/[0.16] motion-safe:hover:-translate-y-px"
      : ""
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export type CountChartRow = { label: string; value: number };

export function CasesByMonthChart({ rows }: { rows: CountChartRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <section className="card p-5 sm:p-6">
      <ChartHeader title="Casos por mes" meta={`Últimos 12 meses · ${total} casos`} />
      {total === 0 ? (
        <ChartEmpty>Aún no hay casos en este periodo.</ChartEmpty>
      ) : (
        <ul aria-label="Casos creados por mes" className="grid h-44 grid-cols-12 items-end gap-1 sm:gap-2">
          {rows.map((row) => (
            <li key={row.label} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-medium tabular-nums text-slate-700">{row.value || ""}</span>
              <span className="flex h-28 w-full items-end border-b border-slate-900/[0.12]">
                <span
                  className={`w-full rounded-t-[3px] ${row.value ? "bg-brand-700" : "bg-slate-900/[0.06]"}`}
                  style={{ height: row.value ? `${Math.max(4, (row.value / max) * 100)}%` : 2 }}
                  title={`${row.label}: ${row.value} casos`}
                />
              </span>
              <span className="text-[11px] capitalize text-slate-500">{row.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CasesByMatterChart({ rows }: { rows: CountChartRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <section className="card p-5 sm:p-6">
      <ChartHeader title="Casos por materia" meta={`Histórico · ${total} casos`} />
      {rows.length === 0 ? (
        <ChartEmpty>Aún no hay casos registrados.</ChartEmpty>
      ) : (
        <ul className="max-h-44 space-y-3.5 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-3">
              <span className="truncate text-sm text-slate-600" title={row.label}>
                {row.label}
              </span>
              <span className="h-2 rounded-full bg-slate-900/[0.05]">
                <span
                  className="block h-full rounded-full bg-brand-700"
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </span>
              <span className="text-right text-sm font-medium tabular-nums text-slate-900">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RequestDecisionTimeChart({
  averageDays,
  requestCount,
}: {
  averageDays: number | null;
  requestCount: number;
}) {
  const formatted = averageDays === null ? null : formatAverageDuration(averageDays);
  return (
    <section className="card flex flex-col p-5 sm:p-6">
      <ChartHeader title="Tiempo hasta decidir una solicitud">
        <p className="mt-1 text-xs text-slate-500">Promedio desde que el cliente la envía hasta que se acepta o se rechaza.</p>
      </ChartHeader>
      {formatted === null ? (
        <ChartEmpty>Aún no hay solicitudes con decisión definitiva.</ChartEmpty>
      ) : (
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="font-display text-[2.625rem] font-normal leading-none tracking-[-0.02em] tabular-nums text-slate-900">
            {formatted.value}
          </span>
          <span className="text-sm text-slate-500">{formatted.unit} de promedio</span>
          <span className="ml-auto text-xs tabular-nums text-slate-500">
            {requestCount} {requestCount === 1 ? "solicitud decidida" : "solicitudes decididas"}
          </span>
        </div>
      )}
    </section>
  );
}

export type LawyerAppointmentsRow = {
  id: string;
  name: string;
  byStatus: Partial<Record<"pendiente" | "confirmada" | "completada" | "cancelada", number>>;
};

const APPOINTMENT_STATUSES = ["pendiente", "confirmada", "completada", "cancelada"] as const;
const APPOINTMENT_LABELS = {
  pendiente: "Pendientes",
  confirmada: "Confirmadas",
  completada: "Completadas",
  cancelada: "Canceladas",
} as const;
/**
 * Mismos tonos que las insignias de las citas (ámbar, salvia, pizarra, gris), leídos de los tokens
 * para que se adapten al modo oscuro.
 */
const APPOINTMENT_COLORS = {
  pendiente: "rgb(var(--amber-500))",
  confirmada: "rgb(var(--emerald-600))",
  completada: "rgb(var(--sky-600))",
  cancelada: "rgb(var(--slate-300))",
} as const;
/** Tinta de los números dentro de cada tramo (≥4.5:1 con su relleno en ambos temas). */
const APPOINTMENT_INK = {
  pendiente: "#171511",
  confirmada: "rgb(var(--surface))",
  completada: "rgb(var(--surface))",
  cancelada: "rgb(var(--slate-800))",
} as const;

export function LawyerAppointmentsChart({ rows }: { rows: LawyerAppointmentsRow[] }) {
  const totals = rows.map((row) => APPOINTMENT_STATUSES.reduce((sum, status) => sum + (row.byStatus[status] ?? 0), 0));
  const max = Math.max(1, ...totals);

  return (
    <section className="card p-5 sm:p-6">
      <ChartHeader title="Citas por abogado" meta="Todas las citas">
        <Legend items={APPOINTMENT_STATUSES.map((s) => ({ key: s, label: APPOINTMENT_LABELS[s], color: APPOINTMENT_COLORS[s] }))} />
      </ChartHeader>
      {rows.length === 0 ? (
        <ChartEmpty>Todavía no hay abogados con citas.</ChartEmpty>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3">
              <span className="truncate text-sm text-slate-600" title={row.name}>
                {row.name}
              </span>
              <span className="flex items-center gap-3">
                <span className="flex h-5 flex-1">
                  <span
                    className="flex h-full gap-[2px]"
                    style={{ width: totals[index] ? `${(totals[index] / max) * 100}%` : 0 }}
                  >
                    {APPOINTMENT_STATUSES.map((status) => {
                      const count = row.byStatus[status] ?? 0;
                      return count ? (
                        <span
                          key={status}
                          className="flex h-full items-center justify-center text-[11px] font-semibold tabular-nums first:rounded-l-[4px] last:rounded-r-[4px]"
                          style={{
                            flexGrow: count,
                            flexBasis: 0,
                            backgroundColor: APPOINTMENT_COLORS[status],
                            color: APPOINTMENT_INK[status],
                          }}
                          title={`${row.name} · ${APPOINTMENT_LABELS[status]}: ${count}`}
                        >
                          {count}
                        </span>
                      ) : null;
                    })}
                  </span>
                </span>
                <span className="w-6 text-right text-sm font-medium tabular-nums text-slate-900">{totals[index]}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.key} className="flex items-center gap-1.5">
          <Swatch color={i.color} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Barras horizontales: casos por estado. Cada barra filtra el listado. */
export function CasesByStatusChart({
  counts,
  statuses,
}: {
  counts: Record<CaseStatus, number>;
  statuses: readonly CaseStatus[];
}) {
  const max = Math.max(1, ...statuses.map((s) => counts[s]));
  const total = statuses.reduce((a, s) => a + counts[s], 0);

  return (
    <div className="card h-full p-5 sm:p-6">
      <ChartHeader as="h2" title="Casos por estado" meta={`${total} en total`} />
      <ul className="space-y-1">
        {statuses.map((s) => {
          const n = counts[s];
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={s}>
              <Link
                href={casesByStatusHref(s)}
                className="group relative -mx-2 grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-slate-900/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className="flex items-center gap-2 text-sm text-slate-600 group-hover:text-slate-900">
                  <Swatch color={STATUS_SERIES_COLOR[s]} />
                  {CASE_STATUS_LABELS[s]}
                </span>
                <span className="h-2.5 rounded-full bg-slate-900/[0.05]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: n ? `${Math.max(2, (n / max) * 100)}%` : 0,
                      backgroundColor: STATUS_SERIES_COLOR[s],
                    }}
                  />
                </span>
                <span className="text-right text-sm font-medium tabular-nums text-slate-900">{n}</span>
                <Tip>
                  {CASE_STATUS_LABELS[s]}: {n} caso{n === 1 ? "" : "s"} ({pct}%)
                </Tip>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type LawyerLoadRow = {
  id: string;
  name: string;
  byStatus: Partial<Record<CaseStatus, number>>;
  overdueTasks: number;
};

/** Barras apiladas: casos activos por abogado, segmentados por estado. */
export function LawyerLoadChart({
  rows,
  statuses,
}: {
  rows: LawyerLoadRow[];
  statuses: readonly CaseStatus[];
}) {
  const totals = rows.map((r) => statuses.reduce((a, s) => a + (r.byStatus[s] ?? 0), 0));
  const max = Math.max(1, ...totals);

  return (
    <div className="card h-full p-5 sm:p-6">
      <ChartHeader as="h2" title="Carga por abogado" meta="Casos activos (sin cerrados)">
        <Legend items={statuses.map((s) => ({ key: s, label: CASE_STATUS_LABELS[s], color: STATUS_SERIES_COLOR[s] }))} />
      </ChartHeader>

      {rows.length === 0 ? (
        <ChartEmpty>Sin abogados activos.</ChartEmpty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const total = totals[i];
            const segments = statuses.filter((s) => (r.byStatus[s] ?? 0) > 0);
            return (
              <li key={r.id} className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3">
                <span className="truncate text-sm text-slate-600" title={r.name}>
                  {r.name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="flex h-5 flex-1">
                    <span
                      className="flex h-full gap-[2px]"
                      style={{ width: total ? `${Math.max(2, (total / max) * 100)}%` : 0 }}
                    >
                      {segments.map((s, idx) => {
                        const n = r.byStatus[s] ?? 0;
                        const wide = n / max >= 0.08;
                        return (
                          <span
                            key={s}
                            tabIndex={0}
                            className={`group relative flex h-full items-center justify-center text-[11px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                              idx === 0 ? "rounded-l-[4px]" : ""
                            } ${idx === segments.length - 1 ? "rounded-r-[4px]" : ""}`}
                            style={{
                              flexGrow: n,
                              flexBasis: 0,
                              backgroundColor: STATUS_SERIES_COLOR[s],
                              color: STATUS_SERIES_INK[s],
                            }}
                          >
                            {wide && n}
                            <Tip>
                              {r.name} · {CASE_STATUS_LABELS[s]}: {n}
                            </Tip>
                          </span>
                        );
                      })}
                    </span>
                  </span>
                  <span className="w-6 text-right text-sm font-medium tabular-nums text-slate-900">{total}</span>
                  <span
                    className={`flex w-24 items-center justify-end gap-1 text-xs tabular-nums ${
                      r.overdueTasks ? "font-medium text-red-700" : "text-slate-400"
                    }`}
                  >
                    {r.overdueTasks ? (
                      <>
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {r.overdueTasks} vencida{r.overdueTasks === 1 ? "" : "s"}
                      </>
                    ) : (
                      "al día"
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <details className="group/table mt-5 text-xs text-slate-600">
        <summary className="cursor-pointer select-none text-slate-500 transition-colors hover:text-brand-700">
          Ver como tabla
        </summary>
        <table className="mt-3 w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.06em] text-slate-500">
              <th className="py-1.5 pr-2 font-medium">Abogado</th>
              {statuses.map((s) => (
                <th key={s} className="py-1.5 pr-2 text-right font-medium">
                  {CASE_STATUS_LABELS[s]}
                </th>
              ))}
              <th className="py-1.5 pr-2 text-right font-medium">Total</th>
              <th className="py-1.5 text-right font-medium">Tareas vencidas</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-900/[0.06]">
                <td className="py-1.5 pr-2">{r.name}</td>
                {statuses.map((s) => (
                  <td key={s} className="py-1.5 pr-2 text-right">
                    {r.byStatus[s] ?? 0}
                  </td>
                ))}
                <td className="py-1.5 pr-2 text-right font-semibold">{totals[i]}</td>
                <td className="py-1.5 text-right">{r.overdueTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
