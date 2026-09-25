import Link from "next/link";
import { CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";
import { STATUS_SERIES_COLOR, STATUS_SERIES_INK } from "@/lib/viz";

/** Tooltip CSS (hover + foco de teclado); el padre debe ser `group relative`. */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

function Swatch({ status }: { status: CaseStatus }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: STATUS_SERIES_COLOR[status] }}
      aria-hidden
    />
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
  const body = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{value}</span>
        {tone === "critical" && value > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
            ! Requiere atención
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </>
  );
  const cls = `block rounded-xl border bg-white p-4 ${
    tone === "critical" && value > 0 ? "border-red-200" : "border-slate-200"
  } ${href ? "transition hover:border-brand-500" : ""}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Casos por estado</h2>
        <span className="text-xs text-slate-500">{total} en total</span>
      </div>
      <ul className="space-y-3">
        {statuses.map((s) => {
          const n = counts[s];
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={s}>
              <Link
                href={`/dashboard?status=${s}`}
                className="group relative grid grid-cols-[6.5rem_1fr] items-center gap-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <Swatch status={s} />
                  {CASE_STATUS_LABELS[s]}
                </span>
                <span className="flex items-center gap-2">
                  <span className="relative h-5 flex-1">
                    <span
                      className="absolute inset-y-0 left-0 rounded-r transition-[filter] group-hover:brightness-95"
                      style={{
                        width: n ? `${Math.max(2, (n / max) * 100)}%` : 0,
                        backgroundColor: STATUS_SERIES_COLOR[s],
                      }}
                    />
                  </span>
                  <span className="w-8 text-right text-sm font-semibold tabular-nums text-slate-800">{n}</span>
                </span>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Carga por abogado</h2>
        <span className="text-xs text-slate-500">Casos activos (sin cerrados)</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {statuses.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <Swatch status={s} />
            {CASE_STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-sm text-slate-400">Sin abogados activos</p>
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
                <span className="flex items-center gap-2">
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
                            className={`group relative flex h-full items-center justify-center text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                              idx === segments.length - 1 ? "rounded-r" : ""
                            }`}
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
                  <span className="w-8 text-right text-sm font-semibold tabular-nums text-slate-800">{total}</span>
                  <span
                    className={`w-20 text-right text-xs ${r.overdueTasks ? "font-semibold text-red-700" : "text-slate-400"}`}
                  >
                    {r.overdueTasks ? `! ${r.overdueTasks} vencida${r.overdueTasks === 1 ? "" : "s"}` : "al día"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-4 text-xs text-slate-600">
        <summary className="cursor-pointer text-slate-500 hover:text-brand-700">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-2 font-medium">Abogado</th>
              {statuses.map((s) => (
                <th key={s} className="py-1 pr-2 text-right font-medium">{CASE_STATUS_LABELS[s]}</th>
              ))}
              <th className="py-1 pr-2 text-right font-medium">Total</th>
              <th className="py-1 text-right font-medium">Tareas vencidas</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1 pr-2">{r.name}</td>
                {statuses.map((s) => (
                  <td key={s} className="py-1 pr-2 text-right">{r.byStatus[s] ?? 0}</td>
                ))}
                <td className="py-1 pr-2 text-right font-semibold">{totals[i]}</td>
                <td className="py-1 text-right">{r.overdueTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
