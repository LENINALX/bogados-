import Link from "next/link";
import { ArrowLeft, Briefcase, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "./shell/BrandMark";
import { HeroBackdrop } from "./landing/Hero";

const POINTS = [
  { icon: Briefcase, text: "Expedientes, documentos y plazos en un solo lugar" },
  { icon: Users, text: "Un portal para que cada cliente siga su caso" },
  { icon: ShieldCheck, text: "Datos aislados por firma y documentos privados" },
];

/**
 * Marco de las pantallas sin sesión: login, recuperar y restablecer contraseña.
 * Escritorio: panel de marca (el mismo fondo que la portada) + formulario sobre material.
 * Móvil: solo el formulario, con el logotipo arriba.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-shell lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-3 lg:p-3">
      <BrandPanel />

      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0 lg:overflow-y-auto">
        {/* Halo muy suave detrás del formulario */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[8%] -z-0 h-[26rem] w-[34rem] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--brand-200)/0.55),transparent)] blur-2xl"
        />

        <div className="relative w-full max-w-[27rem]">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandMark />
          </div>

          <div className="shell-panel animate-enter rounded-[28px] p-7 sm:p-9">
            <h1 className="text-[1.75rem] font-medium leading-tight tracking-[-0.028em] text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-500">{subtitle}</p>}
            <div className="auth-form mt-7">{children}</div>
          </div>

          {footer}

          <p className="mt-7 text-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
              Volver a la página principal
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Panel de marca (solo escritorio): oscuro en ambos temas, con la entrada coreografiada de la portada. */
function BrandPanel() {
  return (
    <aside
      aria-hidden
      className="relative isolate hidden flex-col justify-between overflow-hidden rounded-[28px] bg-[#0b1311] p-10 text-white lg:flex xl:p-14"
    >
      <HeroBackdrop fade={false} />

      <BrandMark light />

      <div className="max-w-lg">
        <p className="hero-eyebrow flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
          <span className="hero-rule hero-rule-right h-px w-10 bg-accent-light/80" />
          Gestión legal para firmas
        </p>
        <h2 className="mt-5 text-[clamp(2rem,3.4vw,3.25rem)] font-bold uppercase leading-[1.06] tracking-[-0.012em]">
          <span className="hero-line">
            <span className="hero-line-inner" style={{ animationDelay: "160ms" }}>
              Tu despacho, ordenado.
            </span>
          </span>
          <span className="hero-line">
            <span className="hero-line-inner" style={{ animationDelay: "280ms" }}>
              Tus clientes, <span className="hero-accent text-accent-light">informados</span>.
            </span>
          </span>
        </h2>
        <ul className="mt-9 space-y-3.5">
          {POINTS.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              className="hero-rise flex items-center gap-3.5 text-[0.9375rem] text-white/75"
              style={{ animationDelay: `${420 + i * 90}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-accent-light">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-white/40">© {new Date().getFullYear()} Bogados · Hecho en Ecuador</p>
    </aside>
  );
}
