import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleSlash, FileText, Hourglass, ListChecks, MessageSquare, PauseCircle } from "lucide-react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalLayout } from "@/components/PortalLayout";
import { CaseMessages } from "@/components/CaseMessages";
import { CaseDocuments } from "@/components/CaseDocuments";
import { CaseTimeline } from "@/components/CaseTimeline";
import { ProcessNumberLink } from "@/components/ProcessNumberLink";
import { StateBadge } from "@/components/portal/StateBadge";
import { clientCaseState } from "@/components/portal/case-state";
import { toTimelineEvents, toTimelineNotes } from "@/lib/timeline";
import { documentFields, messageFields } from "@/lib/client-fields";
import type { CaseRequestState } from "@bogados/shared";

type Props = { params: { id: string } };

type OpenRequest = Exclude<CaseRequestState, "aceptada">;

const REQUEST_MESSAGE: Record<OpenRequest, string> = {
  pendiente: "Hemos recibido tu solicitud y la estamos revisando. Te avisaremos por email.",
  aplazada: "Hemos aplazado la decisión sobre tu solicitud. No está rechazada: te avisaremos cuando la retomemos.",
  rechazada: "En esta ocasión no podemos asumir tu caso.",
};

const REQUEST_NOTICE: Record<OpenRequest, { icon: typeof Hourglass; box: string; iconBox: string }> = {
  pendiente: { icon: Hourglass, box: "border-amber-200 bg-amber-50", iconBox: "bg-amber-100 text-amber-700" },
  aplazada: { icon: PauseCircle, box: "border-sky-200 bg-sky-50", iconBox: "bg-sky-100 text-sky-700" },
  rechazada: { icon: CircleSlash, box: "border-red-200 bg-red-50", iconBox: "bg-red-100 text-red-700" },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export default async function PortalCasePage({ params }: Props) {
  const session = await requireRole("CLIENTE");

  const [tenant, c] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { timezone: true } }),
    prisma.case.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        clientId: session.user.id,
      },
      include: {
        lawyer: { select: { name: true } },
        notes: {
          where: { isInternal: false },
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        // select explícito: storagePath, tenantId, etc. no deben llegar al navegador
        documents: {
          where: { sharedWithClient: true },
          select: documentFields,
          orderBy: { createdAt: "desc" },
        },
        messages: {
          select: messageFields,
          orderBy: { createdAt: "asc" },
        },
        activityEvents: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!c) notFound();

  // Solicitud del portal aún no aceptada: lo que importa al cliente es su estado
  const request = c.requestState && c.requestState !== "aceptada" ? c.requestState : null;
  const state = clientCaseState(c.status, request);
  const timeZone = tenant?.timezone ?? "America/Guayaquil";
  const longDate = (d: Date) =>
    new Intl.DateTimeFormat("es-EC", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(d);

  // Notas ya filtradas (isInternal=false); eventos por lista blanca de cliente
  const timeline = [
    ...toTimelineNotes(c.notes),
    ...toTimelineEvents(c.activityEvents, "client"),
  ];

  const sections = [
    { id: "avances", label: "Avances", icon: ListChecks, count: timeline.length },
    ...(request
      ? []
      : [
          { id: "mensajes", label: "Mensajes", icon: MessageSquare, count: c.messages.length },
          { id: "documentos", label: "Documentos", icon: FileText, count: c.documents.length },
        ]),
  ];

  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-3xl">
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

        <header>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <StateBadge tone={state.tone}>{state.label}</StateBadge>
            {!request && state.meaning && <p className="text-[13px] text-slate-600">{state.meaning}</p>}
          </div>
          <h1 className="page-title mt-3 break-words">{c.title}</h1>
          {c.description && (
            <p className="mt-3 max-w-[62ch] whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-slate-600">
              {c.description}
            </p>
          )}
        </header>

        {request && <RequestNotice state={request} reason={c.decisionReason} />}

        <dl className="card mt-6 grid grid-cols-2 gap-x-6 gap-y-4 p-4 sm:p-5">
          {request ? (
            <Fact label="Enviada el">{longDate(c.createdAt)}</Fact>
          ) : (
            <Fact label="Tu abogado">
              {c.lawyer ? (
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white"
                    aria-hidden
                  >
                    {initials(c.lawyer.name)}
                  </span>
                  {c.lawyer.name}
                </span>
              ) : (
                <span className="text-slate-500">Por asignar</span>
              )}
            </Fact>
          )}
          {c.matterType ? (
            <Fact label="Materia">{c.matterType}</Fact>
          ) : (
            !request && <Fact label="En el despacho desde">{longDate(c.openedAt)}</Fact>
          )}
          {c.processNumber && (
            <div className="col-span-2 -mx-4 border-t border-slate-900/[0.06] px-4 pt-4 sm:-mx-5 sm:px-5">
              <dt className="text-xs text-slate-500">Proceso judicial</dt>
              <dd className="mt-1">
                <ProcessNumberLink processNumber={c.processNumber} />
              </dd>
            </div>
          )}
        </dl>

        {sections.length > 1 && (
          <nav aria-label="En esta página" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-md font-medium text-slate-600 transition-colors duration-150 hover:text-slate-900"
              >
                <s.icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {s.label}
                <span className="tabular-nums text-slate-400">{s.count}</span>
              </a>
            ))}
          </nav>
        )}

        <div className={`space-y-6 ${sections.length > 1 ? "mt-4" : "mt-8"}`}>
          <div id="avances" className="scroll-mt-20">
            <CaseTimeline title="Avances del caso" items={timeline} audience="client" />
          </div>

          {/* Mensajes y documentos, cuando el despacho acepta la solicitud (antes no hay abogado) */}
          {!request && (
            <>
              <div id="mensajes" className="scroll-mt-20">
                <CaseMessages
                  caseId={c.id}
                  currentUserId={session.user.id}
                  initial={c.messages.map((m) => ({
                    ...m,
                    createdAt: m.createdAt.toISOString(),
                  }))}
                />
              </div>

              <div id="documentos" className="scroll-mt-20">
                <CaseDocuments
                  caseId={c.id}
                  canMarkInternal={false}
                  initial={c.documents.map((d) => ({
                    ...d,
                    createdAt: d.createdAt.toISOString(),
                  }))}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </PortalLayout>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-[0.9375rem] font-medium text-slate-900">{children}</dd>
    </div>
  );
}

/** Estado de una solicitud aún no aceptada, con el comentario del despacho si lo hay. */
function RequestNotice({ state, reason }: { state: OpenRequest; reason: string | null }) {
  const { icon: Icon, box, iconBox } = REQUEST_NOTICE[state];
  return (
    <div role="status" className={`mt-6 flex items-start gap-3 rounded-[12px] border px-4 py-3.5 ${box}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${iconBox}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 pt-1 text-sm leading-relaxed text-slate-800">
        <p>{REQUEST_MESSAGE[state]}</p>
        {reason && (
          <p className="mt-2 border-t border-slate-900/[0.08] pt-2 text-slate-700">
            <span className="font-medium text-slate-900">
              {state === "rechazada" ? "Motivo" : "Comentario del despacho"}:
            </span>{" "}
            <span className="whitespace-pre-wrap">{reason}</span>
          </p>
        )}
      </div>
    </div>
  );
}
