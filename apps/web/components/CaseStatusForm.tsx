"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";

export function CaseStatusForm({
  caseId,
  status,
}: {
  caseId: string;
  status: string;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value;
    const previousStatus = selectedStatus;
    setSelectedStatus(nextStatus);
    setError(null);
    try {
      await nestFetch(`/cases/${caseId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } catch {
      setSelectedStatus(previousStatus);
      setError("No se pudo actualizar el estado.");
    }
  }

  useEffect(() => setSelectedStatus(status), [status]);

  return (
    <div>
      <select
        value={selectedStatus}
        onChange={onChange}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      >
        {CASE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CASE_STATUS_LABELS[s as CaseStatus]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
