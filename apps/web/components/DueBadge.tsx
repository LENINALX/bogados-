import { CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { DUE_STYLES, DueState } from "@/lib/tasks";
import { Badge, type Tone } from "./staff/primitives";

const TONE: Record<DueState, Tone> = { overdue: "red", soon: "amber", ok: "slate", done: "emerald" };
const ICON = { overdue: TriangleAlert, soon: Clock, ok: undefined, done: CircleCheck } as const;

export function DueBadge({ state }: { state: DueState }) {
  return (
    <Badge tone={TONE[state]} icon={ICON[state]}>
      {DUE_STYLES[state].label}
    </Badge>
  );
}
