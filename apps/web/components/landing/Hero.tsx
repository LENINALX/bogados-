import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

/**
 * Portada a pantalla completa (oscura en ambos temas).
 *
 * Coreografía de entrada (personalidad «premium»: sin rebote, curva de salida suave):
 *   0 ms     ambiente: el fondo se asienta (escala 1.06 → 1) y la luz cálida aparece
 *   100 ms   antetítulo: las líneas doradas se dibujan desde el centro
 *   180 ms   titular, línea 1: sube desde detrás de una máscara
 *   300 ms   titular, línea 2
 *   760 ms   secundario: subrayado dorado bajo «informados»
 *   420 ms   entradilla y botones (suben y se enfocan)
 *   1100 ms  indicador de scroll
 * Con el scroll, el fondo se mueve más despacio que el texto (parallax) y el texto se desvanece.
 * Con movimiento reducido solo quedan fundidos.
 */
export function Hero() {
  return (
    <section
      id="inicio"
      className="hero relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#050b16] text-white"
    >
      <HeroBackdrop />

      <div className="hero-content relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-36 pt-28 text-center sm:px-6 sm:pb-48 lg:px-8">
        <p className="hero-eyebrow flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75 sm:text-xs">
          <span aria-hidden className="hero-rule hero-rule-left hidden h-px w-12 bg-gold/80 sm:block" />
          Gestión legal para firmas de abogados
          <span aria-hidden className="hero-rule hero-rule-right hidden h-px w-12 bg-gold/80 sm:block" />
        </p>

        <h1 className="mt-6 text-[clamp(2.1rem,4.7vw,4.25rem)] font-bold uppercase leading-[1.06] tracking-[-0.012em]">
          <span className="hero-line">
            <span className="hero-line-inner" style={{ animationDelay: "180ms" }}>
              Tu despacho, ordenado.
            </span>
          </span>
          <span className="hero-line">
            <span className="hero-line-inner" style={{ animationDelay: "300ms" }}>
              Tus clientes, <span className="hero-accent text-gold">informados</span>.
            </span>
          </span>
        </h1>

        <p className="hero-rise mt-7 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg" style={{ animationDelay: "420ms" }}>
          Expedientes, documentos, citas y mensajes en un solo lugar, con un portal donde cada cliente sigue su caso sin
          tener que llamarte.
        </p>

        <div className="hero-rise mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "500ms" }}>
          <Link href="/login" className="btn-gold group rounded-full px-7 py-3.5 text-[0.9375rem] uppercase tracking-[0.06em]">
            Acceder a mi firma
            <ArrowRight className="cta-arrow h-4 w-4" aria-hidden />
          </Link>
          <a
            href="#demo"
            className="btn group rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-[0.9375rem] uppercase tracking-[0.06em] text-white backdrop-blur-md hover:border-white/35 hover:bg-white/15"
          >
            <span className="play-dot flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#050b16]">
              <Play className="h-3 w-3 translate-x-[1px] fill-current" aria-hidden />
            </span>
            Ver demostración
          </a>
        </div>
      </div>

      <a href="#demo" aria-label="Bajar a la demostración" className="hero-cue absolute bottom-44 left-1/2 hidden -translate-x-1/2 [@media(min-height:940px)]:sm:block">
        <span className="flex h-9 w-6 justify-center rounded-full border-2 border-white/35 pt-1.5">
          <span className="hero-cue-dot h-1.5 w-1 rounded-full bg-white/80" />
        </span>
      </a>
    </section>
  );
}

/** Capas decorativas. El contenedor exterior hace parallax con el scroll; el interior se asienta al cargar. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="hero-parallax pointer-events-none absolute inset-0 -z-10">
      <div className="hero-settle absolute inset-0">
        {/* Base: azul noche con una zona más clara arriba */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_0%,#163764_0%,#0a1a33_42%,#050b16_100%)]" />
        {/* Luz cálida, como la de una lámpara de despacho: deriva muy despacio */}
        <div className="hero-glow absolute -left-[10%] -top-[20%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(242,174,60,0.22),transparent)] blur-2xl" />
        <div className="absolute -right-[15%] top-[10%] h-[70%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(70,140,230,0.22),transparent)] blur-2xl" />

        {/* Balanza grande, apenas visible */}
        <svg
          viewBox="0 0 24 24"
          className="absolute right-[-8rem] top-1/2 h-[46rem] w-[46rem] -translate-y-1/2 text-white opacity-[0.05] sm:right-[-4rem]"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.22"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>

        {/* Columnas clásicas al fondo */}
        <Columns />

        {/* Grano de película y viñeta */}
        <div className="hero-grain absolute inset-0 opacity-[0.09] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_45%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      </div>
      {/* Funde la portada con el fondo de la página, donde se apoya la demostración */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
}

function Columns() {
  const xs = [60, 230, 400, 800, 970, 1140];
  return (
    <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[70%] w-full text-white opacity-[0.07]">
      <g fill="currentColor">
        {/* Entablamento */}
        <rect x="0" y="40" width="1200" height="14" />
        <rect x="0" y="62" width="1200" height="6" />
        {xs.map((x) => (
          <g key={x}>
            <rect x={x - 34} y="76" width="68" height="12" />
            <rect x={x - 26} y="88" width="52" height="8" />
            <rect x={x - 22} y="96" width="44" height="380" />
            {/* Estrías */}
            {[-12, -4, 4, 12].map((dx) => (
              <rect key={dx} x={x + dx - 1} y="104" width="2" height="364" fill="#050b16" opacity="0.5" />
            ))}
            <rect x={x - 28} y="476" width="56" height="10" />
            <rect x={x - 34} y="486" width="68" height="12" />
          </g>
        ))}
        <rect x="0" y="498" width="1200" height="22" />
      </g>
    </svg>
  );
}
