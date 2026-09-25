"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";

export function TaskDoneToggle({ taskId, done }: { taskId: string; done: boolean }) {
  const [checked, setChecked] = useState(done);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onChange() {
    const next = !checked;
    setChecked(next);
    setPending(true);
    try {
      await nestFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ done: next }),
      });
      router.refresh();
    } catch {
      setChecked(!next);
      alert("No se pudo actualizar la tarea.");
    } finally {
      setPending(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={pending}
      onChange={onChange}
      aria-label={checked ? "Marcar como pendiente" : "Marcar como completada"}
    />
  );
}
