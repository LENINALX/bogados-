import { TONE_BADGE, TONE_DOT, Tone } from "./case-state";

/** Insignia de estado: discreta, con fondo tintado del color semántico y un punto del mismo tono. */
export function StateBadge({ tone, children, className = "" }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${TONE_BADGE[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden />
      {children}
    </span>
  );
}
