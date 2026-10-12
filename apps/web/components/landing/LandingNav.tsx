"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/shell/BrandMark";
import { useDismiss } from "@/lib/use-dismiss";

const SECTIONS = [
  { id: "funciones", label: "Funcionalidades" },
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "seguridad", label: "Seguridad" },
];

/**
 * Barra translúcida: el contenido pasa por debajo y el borde solo aparece cuando hay algo
 * debajo (efecto de borde de scroll). Marca la sección visible para orientarse.
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
    const onScroll = () => setScrolled(window.scrollY > 4);
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
    const onTop = () => window.scrollY < 200 && setActive(null);
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      // Arriba del todo la barra se funde con la portada; con contenido debajo se vuelve material
      className={`sticky top-0 z-40 border-b transition-[border-color,background-color] duration-200 ${
        scrolled ? "material border-slate-200/70" : "border-transparent bg-transparent"
      }`}
    >
      <div ref={panel} className="relative mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:h-16 sm:px-6 lg:px-8">
        <BrandMark />
        <nav aria-label="Secciones" className="hidden items-center gap-1 text-sm md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className="rounded-full px-3 py-1.5 text-slate-600 transition-colors duration-150 hover:text-slate-900 aria-[current]:bg-slate-100 aria-[current]:font-medium aria-[current]:text-slate-900"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="btn-primary btn-sm rounded-full px-4">
            Iniciar sesión
          </Link>
          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="btn-ghost h-9 w-9 rounded-full p-0 md:hidden"
          >
            {open ? <X className="h-[18px] w-[18px]" aria-hidden /> : <Menu className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </div>

        {open && (
          // Nace desde el botón que lo abre (origen arriba a la derecha)
          <nav
            id="landing-menu"
            aria-label="Secciones"
            className="animate-pop absolute right-4 top-full mt-2 w-56 origin-top-right rounded-2xl border border-slate-200/80 bg-surface p-1.5 shadow-xl shadow-slate-900/10 md:hidden"
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={close}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors active:bg-slate-100"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
