import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/session";
import { AppFooter } from "@/components/AppFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Security } from "@/components/landing/Security";
import { Reveal } from "@/components/landing/Reveal";

const STEPS = [
  {
    title: "Registra tu despacho",
    text: "Das de alta tu firma y quedas como administrador. Recibes el código de firma con el que entra todo tu equipo.",
  },
  {
    title: "Prepara la firma",
    text: "Los feriados nacionales de Ecuador ya vienen cargados: añade los locales y los traslados. Después invita a tu equipo por email.",
  },
  {
    title: "Trabaja con tus clientes",
    text: "Abre casos, cuenta términos y agenda citas. Cada cliente recibe su invitación y sigue el avance desde su portal.",
  },
];

/** Cabecera de sección editorial: rótulo al margen, titular serif y entradilla. */
function SectionHeading({ id, label, title, text }: { id: string; label: string; title: string; text?: string }) {
  return (
    <Reveal className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <p className="text-[13px] font-medium text-slate-500 lg:pt-3">{label}</p>
      <div>
        <h2
          id={id}
          className="text-balance font-display text-[clamp(2rem,3.6vw,2.875rem)] font-normal leading-[1.08] tracking-[-0.02em] text-slate-900"
        >
          {title}
        </h2>
        {text && <p className="mt-4 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-slate-600">{text}</p>}
      </div>
    </Reveal>
  );
}

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) redirect(session.user.role === "CLIENTE" ? "/portal" : "/dashboard");

  return (
    <div className="landing min-h-dvh overflow-x-clip bg-canvas">
      <LandingNav />

      <main>
        <Hero />

        {/* Funcionalidades */}
        <section id="funciones" aria-labelledby="funciones-title" className="scroll-mt-16 pb-20 sm:pb-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              id="funciones-title"
              label="Funcionalidades"
              title="Pensado para cómo trabaja un despacho en Ecuador."
              text="Para abogados independientes y estudios jurídicos que quieren dejar atrás la hoja de cálculo, el calendario de pared y los chats sueltos."
            />
            <div className="mt-12 sm:mt-16">
              <Features />
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          aria-labelledby="como-funciona-title"
          className="scroll-mt-16 border-t border-slate-900/[0.08] bg-surface/50 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              id="como-funciona-title"
              label="Cómo funciona"
              title="De la firma registrada al primer cliente informado."
            />
            <ol className="mt-12 grid gap-x-10 gap-y-10 sm:mt-16 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal
                  as="li"
                  key={s.title}
                  delay={i * 100}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-t border-slate-900/[0.14] pt-6 md:block"
                >
                  <span className="block font-display text-[2.25rem] font-light leading-none tabular-nums tracking-[-0.02em] text-red-700 md:text-[3rem]">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[1.125rem] font-semibold tracking-[-0.012em] text-slate-900 md:mt-6">{s.title}</h3>
                    <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-slate-600">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <Security />

        {/* Cierre */}
        <section aria-labelledby="cierre-title" className="py-20 sm:py-28">
          <Reveal className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16 lg:px-8">
            <div>
              <h2
                id="cierre-title"
                className="text-balance font-display text-[clamp(2.25rem,4.6vw,3.75rem)] font-normal leading-[1.04] tracking-[-0.022em] text-slate-900"
              >
                Tu despacho, <em className="font-light italic text-red-700">en&nbsp;orden</em> desde&nbsp;hoy.
              </h2>
              <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-slate-600">
                Registra tu firma y empieza con los feriados de Ecuador ya cargados. Si tu firma ya usa Bogados, entra con
                su código, tu email y tu contraseña.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href="/registro" className="btn-primary group px-5 py-2.5 text-[0.9375rem]">
                Registrar mi despacho
                <ArrowRight className="cta-arrow h-4 w-4" aria-hidden />
              </Link>
              <Link href="/login" className="btn-secondary px-5 py-2.5 text-[0.9375rem]">
                Iniciar sesión
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
