"use client";

import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";

export function CaseStatusForm({
  caseId,
  status,
}: {
  caseId: string;
  status: string;
}) {
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    router.refresh();
  }

  return (
    <select
      defaultValue={status}
      onChange={onChange}
      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
    >
      {CASE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {CASE_STATUS_LABELS[s as CaseStatus]}
        </option>
      ))}
    </select>
  );
}
