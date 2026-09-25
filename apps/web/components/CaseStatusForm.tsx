"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";
import { Spinner, errorMessage } from "./ui";

type SaveState = "idle" | "saving" | "saved" | "error";

export function CaseStatusForm({
  caseId,
  status,
}: {
  caseId: string;
  status: string;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value;
    const previousStatus = selectedStatus;
    setSelectedStatus(nextStatus);
    setState("saving");
    setError(null);
    try {
      await nestFetch(`/cases/${caseId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setState("saved");
      router.refresh();
    } catch (err) {
      setSelectedStatus(previousStatus);
      setState("error");
      setError(errorMessage(err, "No se pudo cambiar el estado. Inténtalo de nuevo."));
    }
  }

  useEffect(() => setSelectedStatus(status), [status]);

  // El "Guardado" desaparece solo tras unos segundos
  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={`status-${caseId}`} className="text-xs font-medium text-slate-500">
          Cambiar estado
        </label>
        <select
          id={`status-${caseId}`}
          value={selectedStatus}
          onChange={onChange}
          disabled={state === "saving"}
          className="input w-auto py-1.5"
        >
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CASE_STATUS_LABELS[s as CaseStatus]}
            </option>
          ))}
        </select>
      </div>
      <p className="min-h-4 max-w-xs text-right text-xs" role={state === "error" ? "alert" : "status"}>
        {state === "saving" && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Spinner className="h-3 w-3" /> Guardando…
          </span>
        )}
        {state === "saved" && <span className="text-emerald-700">✓ Estado actualizado</span>}
        {state === "error" && <span className="text-red-600">{error}</span>}
      </p>
    </div>
  );
}
