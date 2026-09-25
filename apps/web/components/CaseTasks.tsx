"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { DUE_STYLES, dueState, formatDue } from "@/lib/tasks";
import { DueBadge } from "./DueBadge";

export type TaskItem = {
  id: string;
  title: string;
  dueAt: string;
  done: boolean;
  assignee: { id: string; name: string } | null;
};

type StaffUser = { id: string; name: string };

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
}: {
  caseId: string;
  initial: TaskItem[];
  staff: StaffUser[];
  currentUserId: string;
}) {
  const [tasks, setTasks] = useState(() => sortTasks(initial));
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;
    setLoading(true);
    setError(null);
    try {
      const task = await nestFetch<TaskItem>(`/cases/${caseId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          dueAt: new Date(dueAt).toISOString(),
          assigneeId: assigneeId || undefined,
        }),
      });
      setTasks((t) => sortTasks([...t, task]));
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
    <div className="rounded-xl border border-slate-200 bg-white">
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
      <form onSubmit={onCreate} className="space-y-2 border-t p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea o plazo…"
          minLength={2}
          maxLength={200}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            required
            aria-label="Vencimiento"
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            aria-label="Asignar a"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
