import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, ChevronRight, FileLock, KeyRound, LogOut } from "lucide-react";
import { getSession } from "@/lib/session";
import { AppFooter } from "@/components/AppFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { Reveal } from "@/components/landing/Reveal";
import { Hero } from "@/components/landing/Hero";

const STEPS = [
  { title: "Solicita tu caso", text: "Describe tu situación desde el portal. Sin llamadas ni formularios en papel." },
  { title: "El despacho lo revisa", text: "Te avisamos por email si lo aceptamos y quién será tu abogado." },
  { title: "Sigue el avance", text: "Consulta el estado, comparte documentos y pide citas cuando lo necesites." },
];

const SECURITY = [
  { icon: Building2, title: "Cada firma, aislada", text: "Cada consulta se filtra por firma: nadie ve datos de otro despacho." },
  { icon: FileLock, title: "Documentos sin enlaces abiertos", text: "Se descargan con permiso, nunca con una URL pública." },
  { icon: KeyRound, title: "Enlaces de un solo uso", text: "Invitaciones y recuperación de contraseña caducan y no se reutilizan." },
  { icon: LogOut, title: "Sesiones bajo control", text: "Cambiar la contraseña cierra las sesiones abiertas en otros dispositivos." },
];

/** Cabecera de sección: título grande con tracking negativo y entradilla. */
function SectionHeading({ eyebrow, title, text, light = false }: { eyebrow: string; title: string; text?: string; light?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <p className={`text-sm font-semibold ${light ? "text-accent-light" : "text-brand-700"}`}>{eyebrow}</p>
      <h2
        className={`mt-3 text-balance text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.035em] ${
          light ? "text-white" : "text-brand-900"
        }`}
      >
        {title}
      </h2>
      {text && (
        <p className={`mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed ${light ? "text-white/65" : "text-slate-500"}`}>
          {text}
        </p>
      )}
    </Reveal>
  );
}

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) redirect(session.user.role === "CLIENTE" ? "/portal" : "/dashboard");

  return (
    <div className="landing min-h-dvh overflow-x-clip">
      <LandingNav />

      <main>
        <Hero />

        {/* Demostración: se apoya sobre el borde inferior de la portada */}
        <section id="demo" aria-label="Demostración" className="relative z-10 -mt-24 scroll-mt-20 px-4 pb-20 sm:-mt-28 sm:px-6 lg:px-8 lg:pb-28">
          <div className="hero-rise mx-auto max-w-5xl" style={{ animationDelay: "650ms" }}>
            <ProductShowcase />
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funciones" className="scroll-mt-16 bg-surface/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Funcionalidades"
              title="Todo lo que tu firma necesita. Nada que no use."
              text="Pensado para abogados independientes y estudios jurídicos que quieren dejar atrás las hojas de cálculo y los chats sueltos."
            />
            <div className="mt-14">
              <FeatureBento />
            </div>
          </div>
        </section>

        {/* Cómo funciona (para el cliente) */}
        <section id="como-funciona" className="scroll-mt-16 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Para tus clientes"
              title="De la primera consulta al caso resuelto, en tres pasos."
            />
            <ol className="relative mt-14 grid gap-4 md:grid-cols-3 md:gap-6">
              {/* Línea que une los pasos en escritorio */}
              <Reveal
                variant="line"
                className="absolute left-[16.6%] right-[16.6%] top-7 hidden h-px bg-gradient-to-r from-brand-200 via-accent/50 to-brand-200 md:block"
              >
                {null}
              </Reveal>
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 140} className="relative text-center">
                  <span className="pop-in relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-surface text-lg font-semibold tabular-nums text-brand-700 shadow-sm shadow-brand-900/5">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-[1.1875rem] font-semibold tracking-[-0.017em] text-slate-900">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-[0.9375rem] leading-relaxed text-slate-500">{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Seguridad: banda oscura en ambos temas */}
        <section id="seguridad" className="relative scroll-mt-16 overflow-hidden border-y border-white/5 bg-[#0f1a17] py-20 text-white sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_50%_0%,rgba(63,107,86,0.42),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              light
              eyebrow="Seguridad"
              title="La confidencialidad no es opcional."
              text="Trabajas con información sensible. Bogados está construido para protegerla desde el primer día."
            />
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SECURITY.map(({ icon: Icon, title, text }, i) => (
                <Reveal
                  as="li"
                  key={title}
                  delay={i * 70}
                  className="lift rounded-[24px] border border-white/10 bg-white/[0.04] p-6 hover:border-white/20"
                >
                  <span className="pop-in flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-accent-light">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold tracking-[-0.01em] text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Llamada final */}
        <section className="py-20 sm:py-28">
          <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-balance text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-brand-900">
              Tu despacho, en orden desde hoy.
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Entra con el código de tu firma, o crea la cuenta de tu despacho en un minuto.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="btn-accent group rounded-full px-7 py-3.5 text-[0.9375rem] uppercase tracking-[0.06em]">
                Iniciar sesión
                <ArrowRight className="cta-arrow h-4 w-4" aria-hidden />
              </Link>
              <Link href="/registro" className="btn-ghost rounded-full px-5 py-3 text-[0.9375rem] text-brand-700 hover:text-brand-700">
                Registrar mi despacho
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
