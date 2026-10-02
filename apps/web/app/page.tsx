import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CalendarDays,
  FileLock,
  ListChecks,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { AppFooter } from "@/components/AppFooter";
import { BrandMark } from "@/components/shell/BrandMark";

const FEATURES = [
  {
    icon: Briefcase,
    title: "Expedientes ordenados",
    text: "Cada caso con su estado, abogado responsable, notas internas y un historial de todo lo que pasa.",
  },
  {
    icon: Users,
    title: "Portal del cliente",
    text: "Tus clientes ven el avance, los documentos compartidos y te escriben sin depender del correo.",
  },
  {
    icon: CalendarDays,
    title: "Agenda y citas",
    text: "Publica tu disponibilidad y deja que pidan cita sin dobles reservas. Recordatorio automático.",
  },
  {
    icon: FileLock,
    title: "Documentos privados",
    text: "Archivos internos o compartidos con el cliente, siempre con control de acceso.",
  },
  {
    icon: ListChecks,
    title: "Plazos bajo control",
    text: "Tareas con vencimiento por caso y una vista de lo vencido y lo que vence esta semana.",
  },
  {
    icon: Bell,
    title: "Avisos al momento",
    text: "Notificaciones y emails cuando cambia un estado, llega un mensaje o se confirma una cita.",
  },
];

const STEPS = [
  { title: "Solicita tu caso", text: "Describe tu situación desde el portal. Sin llamadas ni formularios en papel." },
  { title: "El despacho lo revisa", text: "Te avisamos por email si lo aceptamos y quién será tu abogado." },
  { title: "Sigue el avance", text: "Consulta el estado, comparte documentos y pide citas cuando lo necesites." },
];

const SECURITY = [
  "Cada firma ve solo sus datos: aislamiento por firma en cada consulta.",
  "Los documentos nunca son públicos: se descargan con permiso, no con un enlace abierto.",
  "Enlaces de acceso de un solo uso, con caducidad.",
  "Cambiar la contraseña cierra las sesiones abiertas en otros dispositivos.",
];

/** Vista previa del producto, construida con la propia interfaz (decorativa). */
function ProductPreview() {
  const rows = [
    { title: "Demanda laboral — despido", who: "Carla Méndez", badge: "Abierto", tone: "bg-emerald-100 text-emerald-800" },
    { title: "Constitución de compañía", who: "Grupo Andes S.A.", badge: "Ingreso", tone: "bg-amber-100 text-amber-800" },
    { title: "Accidente de tránsito", who: "Jorge Paz", badge: "En revisión", tone: "bg-sky-100 text-sky-800" },
  ];
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-transparent to-sky-100 opacity-70 blur-2xl" />
      <div className="card overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="ml-3 text-xs font-medium text-slate-400">Panel de la firma</span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          {[
            ["Casos activos", "24"],
            ["Citas hoy", "3"],
            ["Plazos vencidos", "1"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {rows.map((r) => (
            <li key={r.title} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-brand-700">{r.title}</div>
                <div className="text-xs text-slate-400">{r.who}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tone}`}>{r.badge}</span>
            </li>
          ))}
        </ul>
        <div className="m-4 flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5">
          <CalendarDays className="h-4 w-4 text-brand-700" />
          <span className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Lunes 09:00</span> · Cita confirmada con Carla Méndez
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) redirect(session.user.role === "CLIENTE" ? "/portal" : "/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="material sticky top-0 z-30 border-b border-slate-200/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <BrandMark />
          <nav aria-label="Secciones" className="hidden items-center gap-1 text-sm md:flex">
            {[
              ["Funcionalidades", "#funciones"],
              ["Cómo funciona", "#como-funciona"],
              ["Seguridad", "#seguridad"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                {label}
              </a>
            ))}
          </nav>
          <Link href="/login" className="btn-primary btn-sm ml-auto px-4">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main>
        {/* Portada */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-24 lg:pt-20">
          <div className="animate-enter">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Gestión legal para firmas de abogados
            </span>
            <h1 className="mt-5 text-[clamp(2.25rem,5.5vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-brand-900">
              Tu despacho, ordenado.
              <br />
              <span className="text-slate-400">Tus clientes, informados.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Expedientes, documentos, citas y mensajes en un solo lugar, con un portal donde cada cliente sigue su
              caso sin tener que llamarte.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary px-5 py-2.5">
                Acceder
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#funciones" className="btn-secondary px-5 py-2.5">
                Ver funcionalidades
              </a>
            </div>
          </div>
          <ProductPreview />
        </section>

        {/* Funcionalidades */}
        <section id="funciones" className="scroll-mt-20 border-t border-slate-200/70 bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.025em] text-brand-900">
              Todo lo que tu firma necesita, nada que no use
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">Pensado para despachos pequeños y medianos.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="card p-5 transition-shadow duration-200 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona (para el cliente) */}
        <section id="como-funciona" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.025em] text-brand-900">
              Para tus clientes, en tres pasos
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative pl-12">
                  <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Seguridad */}
        <section id="seguridad" className="scroll-mt-20 border-t border-slate-200/70 bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Lock className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.025em] text-brand-900">
                La confidencialidad no es opcional
              </h2>
              <p className="mt-3 text-slate-600">
                Trabajas con información sensible. Bogados está construido para protegerla desde el primer día.
              </p>
            </div>
            <ul className="space-y-3">
              {SECURITY.map((item) => (
                <li key={item} className="card flex items-start gap-3 p-4 text-sm text-slate-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Llamada final */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-600 px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">¿Ya tienes cuenta?</h2>
              <p className="mt-1 text-white/75">Entra con el código de tu firma, tu email y tu contraseña.</p>
            </div>
            <Link
              href="/login"
              className="btn bg-white px-5 py-2.5 text-brand-600 shadow-sm hover:bg-white/90"
            >
              Iniciar sesión
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
