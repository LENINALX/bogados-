import Link from "next/link";
import { Scale } from "lucide-react";

/** Logotipo: balanza sobre el azul de la firma + nombre. */
export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-xl" aria-label="Bogados, inicio">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-600 text-white shadow-sm shadow-brand-900/20 transition-transform duration-150 ease-out group-active:scale-95">
        <Scale className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
      </span>
      {!compact && (
        <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-brand-900">Bogados</span>
      )}
    </Link>
  );
}
