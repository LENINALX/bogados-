"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ListChecks, Scale, Trash2 } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { dueState, formatDue } from "@/lib/tasks";
import {
  MAX_TERM_DAYS,
  TermDeadline,
  formatYmdLong,
  formatYmdShort,
  summarizeSkipped,
  todayYmd,
} from "@/lib/terms";
import { DueBadge } from "./DueBadge";
import { LIMITS, Schema, clean, rules } from "@/lib/validation";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";
import { FieldError, INVALID_INPUT, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";
import { Badge } from "./staff/primitives";

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
type TaskField = "title" | "notifiedOn" | "termDays" | "dueAt";

const TASK_ORDER: readonly TaskField[] = ["title", "notifiedOn", "termDays", "dueAt"];
const TASK_IDS: Record<TaskField, string> = {
  title: "task-title",
  notifiedOn: "task-notified",
  termDays: "task-days",
  dueAt: "task-due",
};

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

  const today = todayYmd();
  const schema: Schema<TaskField> = {
    title: [
      rules.required(mode === "term" ? "Escribe qué hay que hacer en este término." : "Escribe el título de la tarea."),
      rules.minLength(LIMITS.taskTitle.min, `El título debe tener al menos ${LIMITS.taskTitle.min} caracteres.`),
      rules.maxLength(LIMITS.taskTitle.max),
    ],
    ...(mode === "term"
      ? {
          notifiedOn: [
            rules.required("Indica la fecha en que te notificaron."),
            rules.date(),
            rules.dateBetween(null, today, "La fecha de notificación no puede ser futura."),
          ],
          termDays: [
            rules.required("Indica los días hábiles del término."),
            rules.integer(
              LIMITS.termDays.min,
              LIMITS.termDays.max,
              `El término debe ser de ${LIMITS.termDays.min} a ${LIMITS.termDays.max} días hábiles (número entero).`,
            ),
          ],
        }
      : {
          dueAt: [
            rules.required("Indica la fecha y hora de vencimiento."),
            rules.dateTime(),
            rules.future("El vencimiento ya pasó: elige una fecha y hora futuras."),
          ],
        }),
  };
  const v = useFieldErrors<TaskField>(schema, TASK_ORDER, (k) => TASK_IDS[k]);
  const errors = v.errors;
  const a11y = (k: TaskField, ...extra: (string | false | undefined)[]) => ({
    id: TASK_IDS[k],
    ...fieldA11y(TASK_IDS[k], errors[k], ...extra),
  });
  const invalid = (k: TaskField) => (errors[k] ? INVALID_INPUT : "");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const cleanTitle = clean(title);
    setError(null);
    if (!v.submit({ title: cleanTitle, notifiedOn, termDays: termDays.trim(), dueAt })) return;
    if (mode === "term" && !preview.data) {
      // El vencimiento lo calcula el servidor: sin vista previa no se guarda a ciegas
      if (!preview.loading) setError(preview.error ?? "No se pudo calcular el vencimiento. Revisa la fecha y los días.");
      return;
    }
    setLoading(true);
    try {
      const body =
        mode === "term"
          ? { title: cleanTitle, termDays: days, notifiedOn, assigneeId: assigneeId || undefined }
          : { title: cleanTitle, dueAt: new Date(dueAt).toISOString(), assigneeId: assigneeId || undefined };
      const task = await nestFetch<TaskItem & { notifiedOn?: string | null }>(`/cases/${caseId}/tasks`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setTasks((t) =>
        sortTasks([...t, { ...task, notifiedOn: task.notifiedOn ? task.notifiedOn.slice(0, 10) : null }]),
      );
      setTitle("");
      setDueAt("");
      v.reset();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo crear la tarea."));
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
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-slate-500" aria-hidden />
          Tareas y plazos
        </h2>
        <span className="text-xs tabular-nums text-slate-500">
          {pending} pendiente{pending === 1 ? "" : "s"}
        </span>
      </div>
      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sin tareas ni términos"
          hint="Registra abajo la fecha de notificación y los días: Bogados calcula el vencimiento en días hábiles."
        />
      ) : (
        <ul className="max-h-80 divide-y divide-slate-900/[0.06] overflow-y-auto">
          {tasks.map((t) => {
            const state = dueState(t.dueAt, t.done);
            return (
              <li
                key={t.id}
                className={`group flex items-start gap-3 px-4 py-3 text-sm transition-colors duration-150 sm:px-5 ${
                  state === "overdue" ? "bg-red-50/50" : "hover:bg-slate-900/[0.02]"
                } ${t.done ? "opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t)}
                  aria-label={t.done ? "Marcar como pendiente" : "Marcar como completada"}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                />
                <div className="min-w-0 flex-1">
                  <div className={t.done ? "text-slate-500 line-through" : "font-medium text-slate-900"}>{t.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className={`tabular-nums ${state === "overdue" ? "font-medium text-red-700" : ""}`}>
                      {formatDue(t.dueAt)}
                    </span>
                    <span aria-hidden className="text-slate-300">·</span>
                    <span>{t.assignee?.name ?? "Sin asignar"}</span>
                    <DueBadge state={state} />
                  </div>
                  {t.termDays && t.notifiedOn && (
                    <div className="mt-1.5">
                      <Badge tone="brand" icon={Scale}>
                        Término de {t.termDays} {t.termDays === 1 ? "día hábil" : "días hábiles"} · notificado el{" "}
                        {formatYmdShort(t.notifiedOn)}
                      </Badge>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  className="btn-ghost btn-sm -mr-1.5 h-7 w-7 shrink-0 p-0 text-slate-400 hover:text-red-700"
                  aria-label={`Eliminar la tarea «${t.title}»`}
                  title="Eliminar tarea"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={onCreate} noValidate className="space-y-3 border-t border-slate-900/[0.06] bg-slate-900/[0.015] px-4 py-4 sm:px-5">
        <p className="text-xs font-medium text-slate-600">Nuevo término o tarea</p>
        <div>
          <input
            {...a11y("title")}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              v.change("title", e.target.value);
            }}
            onBlur={(e) => title && v.blur("title", clean(e.target.value))}
            placeholder={mode === "term" ? "Ej.: Contestar la demanda" : "Nueva tarea o plazo…"}
            maxLength={LIMITS.taskTitle.max}
            required
            aria-label="Título"
            className={`input ${invalid("title")}`}
          />
          <FieldError id={TASK_IDS.title} error={errors.title} />
        </div>

        <div role="radiogroup" aria-label="Tipo de vencimiento" className="grid grid-cols-2 gap-0.5 rounded-[10px] bg-slate-900/[0.05] p-0.5">
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
                mode === value
                  ? "bg-surface text-slate-900 shadow-[0_1px_2px_rgb(23_21_17/0.08)]"
                  : "text-slate-500 hover:text-slate-900"
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
                  {...a11y("notifiedOn")}
                  type="date"
                  value={notifiedOn}
                  max={today}
                  onChange={(e) => {
                    setNotifiedOn(e.target.value);
                    v.change("notifiedOn", e.target.value);
                  }}
                  onBlur={(e) => v.blur("notifiedOn", e.target.value)}
                  required
                  className={`input mt-1 ${invalid("notifiedOn")}`}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Días hábiles
                <input
                  {...a11y("termDays")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_TERM_DAYS}
                  step={1}
                  value={termDays}
                  onChange={(e) => {
                    setTermDays(e.target.value);
                    v.change("termDays", e.target.value);
                  }}
                  onBlur={(e) => v.blur("termDays", e.target.value)}
                  required
                  className={`input mt-1 block w-24 ${invalid("termDays")}`}
                />
              </label>
            </div>
            <FieldError id={TASK_IDS.notifiedOn} error={errors.notifiedOn} className="mt-0" />
            <FieldError id={TASK_IDS.termDays} error={errors.termDays} className="mt-0" />
            <TermPreview state={preview} canManageHolidays={canManageHolidays} />
          </>
        ) : (
          <div>
            <input
              {...a11y("dueAt")}
              type="datetime-local"
              value={dueAt}
              onChange={(e) => {
                setDueAt(e.target.value);
                v.change("dueAt", e.target.value);
              }}
              onBlur={(e) => e.target.value && v.blur("dueAt", e.target.value)}
              required
              aria-label="Vencimiento"
              className={`input ${invalid("dueAt")}`}
            />
            <FieldError id={TASK_IDS.dueAt} error={errors.dueAt} />
          </div>
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
            disabled={loading || (mode === "term" && preview.loading)}
            className="btn-primary btn-sm px-3"
          >
            {loading && <Spinner className="h-3 w-3" />}
            {loading ? "Añadiendo…" : mode === "term" ? "Añadir término" : "Añadir"}
          </button>
        </div>
        {error && <FormMessage type="error">{error}</FormMessage>}
      </form>
    </section>
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
      className={`rounded-[10px] border border-brand-200/70 bg-brand-50 px-3 py-2.5 text-xs transition-opacity ${
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
              <li key={s.date} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] tabular-nums text-slate-700">
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
