import { DUE_STYLES, DueState } from "@/lib/tasks";

export function DueBadge({ state }: { state: DueState }) {
  const s = DUE_STYLES[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.badge}`}>
      {state === "overdue" && <span aria-hidden>!</span>}
      {s.label}
    </span>
  );
}
