"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Scale } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { DUE_STYLES, dueState, formatDue } from "@/lib/tasks";
import {
  MAX_TERM_DAYS,
  TermDeadline,
  formatYmdLong,
  formatYmdShort,
  summarizeSkipped,
  todayYmd,
} from "@/lib/terms";
import { DueBadge } from "./DueBadge";

export type TaskItem = {
  id: string;
  title: string;
  dueAt: string;
  done: boolean;
  assignee: { id: string; name: string } | null;
  /** Término procesal: días hábiles y fecha de notificación (YYYY-MM-DD) */
  termDays?: number | null;
  notifiedOn?: string | null;
};

type StaffUser = { id: string; name: string };
type Mode = "date" | "term";

function sortTasks(list: TaskItem[]) {
  return [...list].sort(
    (a, b) => Number(a.done) - Number(b.done) || +new Date(a.dueAt) - +new Date(b.dueAt),
  );
}

export function CaseTasks({
  caseId,
  initial,
  staff,
  currentUserId,
  canManageHolidays = false,
}: {
  caseId: string;
  initial: TaskItem[];
  staff: StaffUser[];
  currentUserId: string;
  /** Admin: enlaza al calendario de feriados desde la vista previa del término */
  canManageHolidays?: boolean;
}) {
  const [tasks, setTasks] = useState(() => sortTasks(initial));
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("term");
  const [dueAt, setDueAt] = useState("");
  const [notifiedOn, setNotifiedOn] = useState(() => todayYmd());
  const [termDays, setTermDays] = useState("3");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const days = Number(termDays);
  const termValid = mode === "term" && !!notifiedOn && Number.isInteger(days) && days >= 1 && days <= MAX_TERM_DAYS;
  const preview = useTermPreview(termValid ? notifiedOn : null, termValid ? days : null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (mode === "date" && !dueAt) return;
    if (mode === "term" && (!termValid || !preview.data)) return;
    setLoading(true);
    setError(null);
    try {
      const body =
        mode === "term"
          ? { title: title.trim(), termDays: days, notifiedOn, assigneeId: assigneeId || undefined }
          : { title: title.trim(), dueAt: new Date(dueAt).toISOString(), assigneeId: assigneeId || undefined };
      const task = await nestFetch<TaskItem & { notifiedOn?: string | null }>(`/cases/${caseId}/tasks`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setTasks((t) =>
        sortTasks([...t, { ...task, notifiedOn: task.notifiedOn ? task.notifiedOn.slice(0, 10) : null }]),
      );
      setTitle("");
      setDueAt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tarea.");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(task: TaskItem) {
    setTasks((t) => sortTasks(t.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x))));
    try {
      await nestFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
      router.refresh();
    } catch {
      setTasks((t) => sortTasks(t.map((x) => (x.id === task.id ? task : x))));
      setError("No se pudo actualizar la tarea.");
    }
  }

  async function remove(task: TaskItem) {
    if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    try {
      await nestFetch(`/tasks/${task.id}`, { method: "DELETE" });
      setTasks((t) => t.filter((x) => x.id !== task.id));
      router.refresh();
    } catch {
      setError("No se pudo eliminar la tarea.");
    }
  }

  const pending = tasks.filter((t) => !t.done).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold text-slate-800">Tareas y plazos</span>
        <span className="text-xs text-slate-500">{pending} pendiente{pending === 1 ? "" : "s"}</span>
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto">
        {tasks.length === 0 && <li className="px-4 py-6 text-sm text-slate-400">Sin tareas</li>}
        {tasks.map((t) => {
          const state = dueState(t.dueAt, t.done);
          return (
            <li key={t.id} className={`flex items-start gap-3 px-4 py-2.5 text-sm ${DUE_STYLES[state].row}`}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t)}
                aria-label={t.done ? "Marcar como pendiente" : "Marcar como completada"}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className={t.done ? "text-slate-500 line-through" : "text-slate-800"}>{t.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{formatDue(t.dueAt)}</span>
                  <span>· {t.assignee?.name ?? "Sin asignar"}</span>
                  <DueBadge state={state} />
                </div>
                {t.termDays && t.notifiedOn && (
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                    <Scale className="h-3 w-3" aria-hidden />
                    Término de {t.termDays} {t.termDays === 1 ? "día hábil" : "días hábiles"} · notificado el{" "}
                    {formatYmdShort(t.notifiedOn)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(t)}
                className="text-xs text-slate-400 hover:text-red-600"
                aria-label="Eliminar tarea"
              >
                Eliminar
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={onCreate} className="space-y-3 border-t p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "term" ? "Ej.: Contestar la demanda" : "Nueva tarea o plazo…"}
          minLength={2}
          maxLength={200}
          required
          aria-label="Título"
          className="input"
        />

        <div role="radiogroup" aria-label="Tipo de vencimiento" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              ["term", "Término en días hábiles", Scale],
              ["date", "Fecha y hora", CalendarClock],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ${
                mode === value ? "bg-surface text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {mode === "term" ? (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="block text-xs font-medium text-slate-600">
                Notificado el
                <input
                  type="date"
                  value={notifiedOn}
                  onChange={(e) => setNotifiedOn(e.target.value)}
                  required
                  className="input mt-1"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Días hábiles
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_TERM_DAYS}
                  value={termDays}
                  onChange={(e) => setTermDays(e.target.value)}
                  required
                  className="input mt-1 block w-24"
                />
              </label>
            </div>
            <TermPreview state={preview} canManageHolidays={canManageHolidays} />
          </>
        ) : (
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            required
            aria-label="Vencimiento"
            className="input"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            aria-label="Asignar a"
            className="input min-w-0 flex-1 py-1.5"
          >
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || (mode === "term" && !preview.data)}
            className="btn-primary btn-sm px-3"
          >
            {mode === "term" ? "Añadir término" : "Añadir"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}

type PreviewState = { data: TermDeadline | null; loading: boolean; error: string | null };

/** Pide el vencimiento al servidor (fuente única del cálculo) con una pequeña espera al teclear. */
function useTermPreview(notifiedOn: string | null, days: number | null): PreviewState {
  const [state, setState] = useState<PreviewState>({ data: null, loading: false, error: null });
  const seq = useRef(0);

  useEffect(() => {
    if (!notifiedOn || !days) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const t = setTimeout(async () => {
      try {
        const data = await nestFetch<TermDeadline>(
          `/terms/deadline?${new URLSearchParams({ notifiedOn, days: String(days) })}`,
        );
        if (id === seq.current) setState({ data, loading: false, error: null });
      } catch (err) {
        if (id === seq.current)
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : "No se pudo calcular." });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [notifiedOn, days]);

  return state;
}

/** El cálculo a la vista: vencimiento, días saltados y por qué. El abogado lo confirma al guardar. */
function TermPreview({ state, canManageHolidays }: { state: PreviewState; canManageHolidays: boolean }) {
  if (state.error) return <p className="text-xs text-red-700">{state.error}</p>;
  if (!state.data) {
    return <p className="text-xs text-slate-400">{state.loading ? "Calculando…" : "Indica la fecha y los días."}</p>;
  }
  const d = state.data;
  return (
    <div
      aria-live="polite"
      className={`rounded-xl border border-brand-200/70 bg-brand-50 px-3 py-2.5 text-xs transition-opacity ${
        state.loading ? "opacity-60" : ""
      }`}
    >
      <p className="text-[13px] text-slate-900">
        Vence el <strong className="font-semibold">{formatYmdLong(d.dueOn)}</strong>, al terminar el día.
      </p>
      <p className="mt-1 text-slate-600">
        {d.days} {d.days === 1 ? "día hábil" : "días hábiles"} desde el día siguiente a la notificación.{" "}
        {summarizeSkipped(d.skipped)}
      </p>
      {d.skipped.some((s) => s.reason !== "Sábado" && s.reason !== "Domingo") && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {d.skipped
            .filter((s) => s.reason !== "Sábado" && s.reason !== "Domingo")
            .map((s) => (
              <li key={s.date} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-slate-700">
                {formatYmdShort(s.date)} · {s.reason}
              </li>
            ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-slate-500">
        Revisa la fecha antes de guardar: el cálculo usa los feriados registrados
        {canManageHolidays ? (
          <>
            {" "}
            en{" "}
            <Link href="/admin/feriados" className="font-medium text-brand-700 underline">
              Feriados
            </Link>
          </>
        ) : (
          " por el administrador"
        )}
        .
      </p>
    </div>
  );
}
