import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { TermVignette } from "@/components/auth/TermVignette";

/** Lo que muestra la viñeta, dicho en texto: el mismo cálculo que hace computeTermDeadline() en la API. */
const EXAMPLE = [
  { label: "Notificación", value: "Jueves 29 de octubre" },
  { label: "Término", value: "3 días hábiles" },
  { label: "No se cuentan", value: "Sábado 31, domingo 1 y los feriados del 2 y 3 de noviembre" },
  { label: "Vence", value: "Jueves 5 de noviembre, 23:59", strong: true },
];

/**
 * Portada sobre papel, en el lenguaje de la pantalla de acceso: titular serif a todo el ancho,
 * debajo la entradilla con las acciones y, al lado, la lámina oscura con un término contándose.
 *
 * Entrada (sin rebote, ≤ 400 ms de escalonado): titular → entradilla → acciones y lámina → ejemplo.
 * La viñeta lleva su propia coreografía. Con movimiento reducido todo aparece quieto.
 */
export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative pt-16">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28">
        <h1
          id="hero-title"
          className="hero-rise text-balance font-display text-[clamp(2.6rem,7vw,5.25rem)] font-normal leading-[1.02] tracking-[-0.025em] text-slate-900"
        >
          Cada término, <em className="font-light italic text-red-700">a&nbsp;tiempo.</em>
          <span className="block text-slate-500">Cada cliente, al&nbsp;tanto.</span>
        </h1>

        <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_33rem] lg:gap-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <p
              className="hero-rise max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-slate-600 sm:text-lg"
              style={{ animationDelay: "90ms" }}
            >
              Bogados lleva los casos de tu firma, cuenta los términos en días hábiles con los feriados de Ecuador y
              avisa a tu cliente por email cuando su caso avanza. Él lo sigue desde su propio portal.
            </p>
            <div className="hero-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "170ms" }}>
              <Link href="/login" className="btn-primary group px-5 py-2.5 text-[0.9375rem]">
                Iniciar sesión
                <ArrowRight className="cta-arrow h-4 w-4" aria-hidden />
              </Link>
              <a href="#como-funciona" className="btn-secondary group px-5 py-2.5 text-[0.9375rem]">
                Ver cómo funciona
                <ArrowDown className="h-4 w-4 text-slate-400 transition-transform duration-150 group-hover:translate-y-0.5" aria-hidden />
              </a>
            </div>
          </div>

          {/* Lámina: oscura en ambos temas, como el panel de marca del acceso */}
          <figure
            className="hero-rise auth-grain relative isolate overflow-hidden rounded-[18px] bg-[#111b19] px-5 pb-5 pt-6 text-white shadow-[0_30px_60px_-36px_rgb(17_27_25/0.6)] ring-1 ring-slate-900/[0.08] sm:px-8 sm:pb-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
            style={{ animationDelay: "140ms" }}
          >
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_65%_at_15%_-5%,rgb(52_96_88/0.6),transparent_62%)]" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_100%_110%,rgb(156_74_60/0.16),transparent_70%)]" />
            <p aria-hidden className="absolute left-8 top-6 hidden max-w-[12rem] text-[12px] leading-snug text-white/50 sm:block">
              <span className="block text-[13px] font-medium text-white/85">Término procesal</span>
              Notificado el jueves 29 de octubre
            </p>
            {/* En móvil el vencimiento ocupa dos líneas: se da algo más de alto para que el aviso no lo tape */}
            <div aria-hidden className="[&>div]:mt-0 max-sm:[&>div]:h-[24.5rem]">
              <TermVignette />
            </div>
            <figcaption className="mt-6 flex items-center justify-between gap-6 border-t border-white/10 pt-4 text-[12px] text-white/50">
              <span>Términos en días hábiles, como los cuenta el COGEP.</span>
              <span className="hidden shrink-0 tabular-nums sm:inline">Ecuador · 2026</span>
            </figcaption>
          </figure>

          {/* El ejemplo de la lámina, en texto (también lo leen los lectores de pantalla) */}
          <div className="hero-rise lg:col-start-1 lg:row-start-2 lg:self-end" style={{ animationDelay: "260ms" }}>
            <h2 className="text-[13px] font-medium text-slate-500">Así cuenta Bogados un término</h2>
            <dl className="mt-3 max-w-xl divide-y divide-slate-900/[0.06] border-y border-slate-900/[0.08] text-[0.875rem]">
              {EXAMPLE.map(({ label, value, strong }) => (
                <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
