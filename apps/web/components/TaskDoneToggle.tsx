"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage } from "./ui";

export function TaskDoneToggle({ taskId, done }: { taskId: string; done: boolean }) {
  const [checked, setChecked] = useState(done);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onChange() {
    const next = !checked;
    setChecked(next);
    setPending(true);
    setError(null);
    try {
      await nestFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ done: next }),
      });
      router.refresh();
    } catch {
      setChecked(!next);
      setError("No se pudo actualizar la tarea.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={onChange}
        aria-label={checked ? "Marcar como pendiente" : "Marcar como completada"}
      />
      {error && <FormMessage type="error">{error}</FormMessage>}
    </div>
  );
}
