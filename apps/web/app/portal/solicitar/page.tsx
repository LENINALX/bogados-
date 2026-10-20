import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { PortalLayout } from "@/components/PortalLayout";
import { CaseRequestForm } from "@/components/CaseRequestForm";

/** Lo que ocurre tras enviar la solicitud (acepta, aplaza o rechaza el despacho; luego, mensajes y documentos) */
const NEXT_STEPS = [
  {
    title: "Revisamos tu solicitud",
    text: "El despacho lee lo que nos cuentas. Verás su estado en Mis casos.",
  },
  {
    title: "Te avisamos por email",
    text: "Tanto si la aceptamos como si necesitamos más tiempo o no podemos asumirla.",
  },
  {
    title: "Tu caso, en un solo lugar",
    text: "Si la aceptamos, tendrás un abogado asignado, mensajes con él y tus documentos.",
  },
];

export default async function RequestCasePage() {
  const session = await requireRole("CLIENTE");
  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-4xl">
        <nav aria-label="Ruta" className="mb-5">
          <Link
            href="/portal"
            className="group inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-500 transition-colors duration-150 hover:text-slate-900"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-150 ease-[var(--ease-premium)] group-hover:-translate-x-0.5"
              aria-hidden
            />
            Mis casos
          </Link>
        </nav>
        <div className="mb-7 max-w-2xl">
          <h1 className="page-title">Solicitar un caso</h1>
          <p className="page-subtitle">
            Cuéntanos tu situación con tus palabras. El despacho la revisará y te avisará por email si la acepta.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10">
          <CaseRequestForm />

          <aside aria-labelledby="next-steps-title" className="lg:pt-2">
            <h2 id="next-steps-title" className="font-display text-[1.125rem] font-medium tracking-[-0.012em] text-slate-900">
              Qué pasa después
            </h2>
            <ol className="relative mt-4 space-y-5">
              {/* Hilo que une los pasos */}
              <span className="absolute bottom-3 left-[11px] top-3 w-px bg-slate-900/[0.1]" aria-hidden />
              {NEXT_STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-3">
                  <span
                    className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-900/[0.12] bg-canvas font-display text-[13px] font-medium tabular-nums text-slate-700"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-slate-900">{step.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </main>
    </PortalLayout>
  );
}
