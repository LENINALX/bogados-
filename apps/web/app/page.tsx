import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, ChevronRight, FileLock, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { AppFooter } from "@/components/AppFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { Reveal } from "@/components/landing/Reveal";

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
      <p className={`text-sm font-semibold ${light ? "text-[#7cc4fa]" : "text-brand-700"}`}>{eyebrow}</p>
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
        {/* Portada */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(50%_60%_at_50%_0%,rgb(var(--brand-100)/0.9),transparent_75%)]"
          />
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 text-center sm:px-6 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-16">
            <p
              className="animate-enter inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-surface/70 px-3.5 py-1 text-[13px] font-medium text-brand-700 backdrop-blur"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Gestión legal para firmas de abogados
            </p>
            <h1
              className="animate-enter mx-auto mt-5 max-w-4xl text-balance text-[clamp(2.75rem,7.2vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-brand-900"
              style={{ animationDelay: "60ms" }}
            >
              Tu despacho, ordenado.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-sky-600 to-brand-700 bg-clip-text text-transparent">
                Tus clientes, informados.
              </span>
            </h1>
            <p
              className="animate-enter mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-500 sm:text-xl"
              style={{ animationDelay: "120ms" }}
            >
              Expedientes, documentos, citas y mensajes en un solo lugar, con un portal donde cada cliente sigue su caso
              sin tener que llamarte.
            </p>
            <div className="animate-enter mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "180ms" }}>
              <Link href="/login" className="btn-primary rounded-full px-6 py-3 text-[0.9375rem]">
                Acceder
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#como-funciona" className="btn-ghost rounded-full px-5 py-3 text-[0.9375rem] text-brand-700 hover:text-brand-700">
                Cómo funciona
                <ChevronRight className="h-4 w-4" aria-hidden />
              </a>
            </div>

            <div className="animate-enter mx-auto mt-12 max-w-5xl" style={{ animationDelay: "260ms" }}>
              <ProductShowcase />
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funciones" className="scroll-mt-16 bg-surface/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Funcionalidades"
              title="Todo lo que tu firma necesita. Nada que no use."
              text="Pensado para despachos pequeños y medianos que quieren dejar atrás las hojas de cálculo y los chats sueltos."
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
              <span
                aria-hidden
                className="absolute left-[16.6%] right-[16.6%] top-7 hidden h-px bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 md:block"
              />
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 90} className="relative text-center">
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-surface text-lg font-semibold tabular-nums text-brand-700 shadow-sm shadow-brand-900/5">
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
        <section id="seguridad" className="relative scroll-mt-16 overflow-hidden border-y border-white/5 bg-[#08111f] py-20 text-white sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_50%_0%,rgba(56,130,220,0.28),transparent_70%)]"
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
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#7cc4fa]">
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
            <p className="mt-4 text-lg text-slate-500">Entra con el código de tu firma, tu email y tu contraseña.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="btn-primary rounded-full px-6 py-3 text-[0.9375rem]">
                Iniciar sesión
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/recuperar" className="btn-ghost rounded-full px-5 py-3 text-[0.9375rem] text-brand-700 hover:text-brand-700">
                Recuperar contraseña
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
