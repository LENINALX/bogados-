import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CaseRequestState } from "@bogados/shared";
import { clientCaseState } from "./case-state";
import { StateBadge } from "./StateBadge";

/**
 * Fila de un asunto del cliente: título, estado con su significado en palabras llanas y
 * quién lo lleva. Toda la fila enlaza al detalle.
 */
export function CaseRow({
  href,
  title,
  status,
  request,
  meta,
  index = 0,
}: {
  href: string;
  title: string;
  status: string;
  request: CaseRequestState | null;
  /** Línea secundaria: abogado y fecha */
  meta: string;
  /** Posición en la lista, para escalonar la entrada (máx. ~320 ms en total) */
  index?: number;
}) {
  const state = clientCaseState(status, request);
  return (
    <li
      className="motion-safe:animate-enter"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Link
        href={href}
        className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ease-[var(--ease-premium)] hover:bg-slate-900/[0.025] focus-visible:bg-slate-900/[0.025] sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words text-[0.9375rem] font-medium leading-snug text-slate-900">{title}</h3>
            <StateBadge tone={state.tone} className="mt-px">
              {state.label}
            </StateBadge>
          </div>
          {state.meaning && <p className="mt-1 text-[13px] leading-snug text-slate-600">{state.meaning}</p>}
          <p className="mt-1 text-xs text-slate-500">{meta}</p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ease-[var(--ease-premium)] group-hover:translate-x-0.5 group-hover:text-slate-600"
          aria-hidden
        />
      </Link>
    </li>
  );
}
