import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { authDisplay, authSans } from "@/app/fonts/auth-fonts";
import { BrandMark } from "./shell/BrandMark";
import { TermVignette } from "./auth/TermVignette";

/**
 * Marco de las pantallas sin sesión: login, recuperar y restablecer contraseña.
 * Escritorio: panel de marca a sangre, con un término real contándose, + formulario sobre papel.
 * Móvil: solo el formulario, con el logotipo arriba.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  step = "enter",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * Cómo llega el contenido: la primera vez sube; al avanzar de paso entra por la derecha y al
   * volver, por la izquierda (por donde se fue), para que el recorrido se entienda.
   */
  step?: "enter" | "forward" | "back";
}) {
  return (
    <div
      className={`${authDisplay.variable} ${authSans.variable} auth-root min-h-dvh bg-canvas lg:grid lg:h-dvh lg:grid-cols-[minmax(0,11fr)_minmax(0,13fr)]`}
    >
      <BrandPanel />

      <main className="auth-paper relative flex min-h-dvh flex-col px-6 pb-6 pt-6 sm:px-10 lg:min-h-0 lg:overflow-y-auto lg:px-14 lg:pt-8">
        <header className="flex items-center justify-between gap-4">
          <span className="lg:hidden">
            <BrandMark />
          </span>
          <Link
            href="/"
            className="group ml-auto inline-flex items-center gap-1.5 rounded-md px-1 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            Volver al inicio
          </Link>
        </header>

        {/* my-auto y no justify-center: si no cabe, se desplaza desde arriba en vez de recortarse */}
        <div key={title} className={`auth-step-${step} mx-auto my-auto w-full max-w-[400px] py-12`}>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-slate-500">{subtitle}</p>}
          <div className="auth-form mt-8">{children}</div>
          {footer}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-slate-900/[0.07] pt-5 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Bogados · Hecho en Ecuador</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" aria-hidden />
            Conexión cifrada · datos aislados por firma
          </span>
        </footer>
      </main>
    </div>
  );
}

/** Panel de marca (solo escritorio): oscuro en ambos temas. Decorativo: el contenido real está en el formulario. */
function BrandPanel() {
  return (
    <aside
      aria-hidden
      className="auth-grain relative isolate hidden flex-col justify-between overflow-hidden bg-[#111b19] px-12 py-10 text-white lg:flex xl:px-16 xl:py-12"
    >
      {/* Luz cenital tenue y un reflejo cálido abajo: la profundidad la dan las capas, no los efectos */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_65%_at_15%_-5%,rgb(52_96_88/0.6),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_100%_110%,rgb(156_74_60/0.16),transparent_70%)]" />

      <BrandMark light />

      <div>
        <h2 className="hero-rise max-w-[28rem] font-[family-name:var(--font-display)] text-[clamp(2.4rem,3.6vw,3.25rem)] font-normal leading-[1.04] tracking-[-0.022em] text-[#f4efe4]">
          Cada término,{" "}
          <em className="font-light italic text-[#e0a593]">a&nbsp;tiempo.</em>
        </h2>
        <p
          className="hero-rise mt-4 max-w-[25rem] text-[0.9375rem] leading-relaxed text-white/60 [@media(max-height:820px)]:hidden"
          style={{ animationDelay: "90ms" }}
        >
          Bogados cuenta los días hábiles, salta fines de semana y feriados, y avisa a tu cliente cuando su caso avanza.
        </p>
        <TermVignette />
      </div>

      <p className="flex items-center justify-between gap-6 border-t border-white/10 pt-5 text-[12px] text-white/45">
        <span>Términos en días hábiles, como los cuenta el COGEP.</span>
        <span className="shrink-0 tabular-nums">Ecuador · {new Date().getFullYear()}</span>
      </p>
    </aside>
  );
}
