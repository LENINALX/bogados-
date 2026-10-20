"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/shell/BrandMark";
import { useDismiss } from "@/lib/use-dismiss";

const SECTIONS = [
  { id: "funciones", label: "Funcionalidades" },
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "seguridad", label: "Seguridad" },
];

/**
 * Barra fija sobre el papel de la portada. Arriba del todo no tiene borde ni fondo; en cuanto
 * hay scroll se vuelve material translúcido con un filete fino (el contenido pasa por debajo).
 * Subraya la sección visible para orientarse.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, panel, close, trigger);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      if (window.scrollY < 200) setActive(null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      // Cuenta como activa la sección que cruza la franja central de la ventana
      { rootMargin: "-45% 0px -50% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-200 ${
        scrolled || open ? "material border-slate-900/[0.08]" : "border-transparent"
      }`}
    >
      <div ref={panel} className="relative mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav aria-label="Secciones" className="hidden items-center gap-6 text-sm md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className="relative py-1 text-slate-600 transition-colors duration-150 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-slate-900 after:transition-transform after:duration-300 after:ease-out hover:text-slate-900 aria-[current]:text-slate-900 aria-[current]:after:scale-x-100"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn-ghost hidden px-3 sm:inline-flex">
            Iniciar sesión
          </Link>
          <Link href="/login" className="btn-secondary px-3.5 sm:hidden">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="btn-primary group hidden sm:inline-flex">
            Crear cuenta
            <ArrowRight className="cta-arrow h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="btn-ghost h-9 w-9 p-0 md:hidden"
          >
            {open ? <X className="h-[18px] w-[18px]" aria-hidden /> : <Menu className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </div>

        {open && (
          // Nace desde el botón que lo abre (origen arriba a la derecha)
          <nav
            id="landing-menu"
            aria-label="Secciones"
            className="animate-pop absolute right-4 top-full mt-2 w-60 origin-top-right rounded-[14px] border border-slate-900/[0.08] bg-surface p-1.5 shadow-[0_18px_40px_-18px_rgb(23_21_17/0.35)] md:hidden"
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={close}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-900/[0.04] active:bg-slate-900/[0.06]"
              >
                {s.label}
              </a>
            ))}
            <div className="my-1.5 h-px bg-slate-900/[0.06]" />
            <Link
              href="/registro"
              onClick={close}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-slate-900/[0.04] active:bg-slate-900/[0.06]"
            >
              Registrar mi despacho
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
