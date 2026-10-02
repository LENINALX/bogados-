import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalLayout } from "@/components/PortalLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseMessages } from "@/components/CaseMessages";
import { CaseDocuments } from "@/components/CaseDocuments";
import { CaseTimeline } from "@/components/CaseTimeline";
import { CaseRequestBadge } from "@/components/CaseRequestBadge";
import { FormMessage } from "@/components/ui";
import { toTimelineEvents, toTimelineNotes } from "@/lib/timeline";
import { documentFields, messageFields } from "@/lib/client-fields";
import type { CaseRequestState } from "@bogados/shared";

type Props = { params: { id: string } };

const REQUEST_MESSAGE: Record<Exclude<CaseRequestState, "aceptada">, string> = {
  pendiente: "Hemos recibido tu solicitud y la estamos revisando. Te avisaremos por email.",
  aplazada: "Hemos aplazado la decisión sobre tu solicitud. No está rechazada: te avisaremos cuando la retomemos.",
  rechazada: "En esta ocasión no podemos asumir tu caso.",
};

export default async function PortalCasePage({ params }: Props) {
  const session = await requireRole("CLIENTE");

  const c = await prisma.case.findFirst({
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
  });

  if (!c) notFound();

  // Solicitud del portal aún no aceptada: lo que importa al cliente es su estado
  const request = c.requestState && c.requestState !== "aceptada" ? c.requestState : null;

  // Notas ya filtradas (isInternal=false); eventos por lista blanca de cliente
  const timeline = [
    ...toTimelineNotes(c.notes),
    ...toTimelineEvents(c.activityEvents, "client"),
  ];

  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-3xl">
        <nav aria-label="Ruta" className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/portal" className="hover:text-brand-700 hover:underline">
            Mis casos
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-slate-700">{c.title}</span>
        </nav>

        <div className="card mb-6 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="page-title">{c.title}</h1>
              {!request && (
                <p className="page-subtitle">
                  Tu abogado:{" "}
                  <span className="font-medium text-slate-700">{c.lawyer?.name ?? "Por asignar"}</span>
                </p>
              )}
            </div>
            {request ? <CaseRequestBadge state={request} /> : <StatusBadge status={c.status} />}
          </div>
          {request && (
            <div className="mt-4">
              <FormMessage type={request === "rechazada" ? "error" : "success"}>
                {REQUEST_MESSAGE[request]}
                {c.decisionReason && (
                  <>
                    <br />
                    <span className="font-medium">
                      {request === "rechazada" ? "Motivo" : "Comentario del despacho"}:
                    </span>{" "}
                    {c.decisionReason}
                  </>
                )}
              </FormMessage>
            </div>
          )}
          {c.description && (
            <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700">
              {c.description}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <CaseTimeline title="Avances del caso" items={timeline} audience="client" />

          {/* Mensajes y documentos, cuando el despacho acepta la solicitud (antes no hay abogado) */}
          {!request && (
            <>
              <CaseMessages
                caseId={c.id}
                currentUserId={session.user.id}
                initial={c.messages.map((m) => ({
                  ...m,
                  createdAt: m.createdAt.toISOString(),
                }))}
              />

              <CaseDocuments
                caseId={c.id}
                canMarkInternal={false}
                initial={c.documents.map((d) => ({
                  ...d,
                  createdAt: d.createdAt.toISOString(),
                }))}
              />
            </>
          )}
        </div>
      </main>
    </PortalLayout>
  );
}
