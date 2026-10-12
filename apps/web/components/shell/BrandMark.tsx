import Link from "next/link";
import { Scale } from "lucide-react";

/** Logotipo: balanza sobre el azul de la firma + nombre. `light` para fondos oscuros (portada). */
export function BrandMark({
  href = "/",
  compact = false,
  light = false,
}: {
  href?: string;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-xl" aria-label="Bogados, inicio">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-white shadow-sm shadow-brand-900/20 transition-[transform,background-color] duration-300 ease-out group-active:scale-95 ${
          light ? "bg-white/15 ring-1 ring-white/25" : "bg-brand-600"
        }`}
      >
        <Scale className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
      </span>
      {!compact && (
        <span
          className={`text-[1.0625rem] font-semibold tracking-[-0.02em] transition-colors duration-300 ${
            light ? "text-white" : "text-brand-900"
          }`}
        >
          Bogados
        </span>
      )}
    </Link>
  );
}
