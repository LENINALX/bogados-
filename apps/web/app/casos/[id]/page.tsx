import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StaffLayout } from "@/components/StaffLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { FormMessage } from "@/components/ui";
import { CaseRequestBadge } from "@/components/CaseRequestBadge";
import { CaseRequestDecision } from "@/components/CaseRequestDecision";
import { OPEN_CASE_REQUEST_STATES } from "@bogados/shared";
import { CaseMessages } from "@/components/CaseMessages";
import { CaseDocuments } from "@/components/CaseDocuments";
import { CaseStatusForm } from "@/components/CaseStatusForm";
import { CaseNoteForm } from "@/components/CaseNoteForm";
import { CaseTasks } from "@/components/CaseTasks";
import { ProcessNumberField } from "@/components/ProcessNumberField";
import { CaseTimeline } from "@/components/CaseTimeline";
import { staffLinks } from "@/lib/nav";
import { emailedNoteIds, toTimelineEvents, toTimelineNotes } from "@/lib/timeline";
import { documentFields, messageFields } from "@/lib/client-fields";

type Props = { params: { id: string }; searchParams: { aviso?: string } };

export default async function CaseDetailPage({ params, searchParams }: Props) {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;

  const c = await prisma.case.findFirst({
    where: {
      id: params.id,
      tenantId,
      ...(role === "ABOGADO" ? { lawyerId: userId } : {}),
    },
    include: {
      lawyer: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      // select explícito: storagePath, tenantId, etc. no deben llegar al navegador
      documents: {
        select: documentFields,
        orderBy: { createdAt: "desc" },
      },
      messages: {
        select: messageFields,
        orderBy: { createdAt: "asc" },
      },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: [{ done: "asc" }, { dueAt: "asc" }],
      },
      activityEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!c) notFound();

  const staff = await prisma.user.findMany({
    where: { tenantId, active: true, role: { in: ["ADMIN", "ABOGADO"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const timeline = [
    ...toTimelineNotes(c.notes, emailedNoteIds(c.activityEvents)),
    ...toTimelineEvents(c.activityEvents, "staff"),
  ];

  const sectionLabel = role === "ADMIN" ? "Casos" : "Mis casos";
  // Solicitud del portal sin decidir: el estado lo cambia la decisión, no el selector
  const openRequest =
    c.requestState && OPEN_CASE_REQUEST_STATES.includes(c.requestState) ? c.requestState : null;

  return (
    <StaffLayout user={session.user} links={staffLinks(role)}>
      <main className="page">
        <nav aria-label="Ruta" className="mb-5 flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500">
          <Link href="/dashboard" className="shrink-0 underline-offset-4 hover:text-brand-700 hover:underline">
            {sectionLabel}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate text-slate-700" aria-current="page">
            {c.title}
          </span>
        </nav>

        {searchParams.aviso === "invitacion" && (
          <div className="mb-4">
            <FormMessage type="error">
              El caso se creó, pero no se pudo enviar la invitación por email a {c.client?.name ?? "el cliente"}.
              {role === "ADMIN"
                ? " Reenvíala desde Usuarios."
                : " Pide a un administrador que la reenvíe desde Usuarios."}
            </FormMessage>
          </div>
        )}

        {openRequest && role === "ADMIN" && (
          <CaseRequestDecision
            caseId={c.id}
            postponed={openRequest === "aplazada"}
            staff={staff}
            currentUserId={userId}
          />
        )}

        <header className="card mb-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-5 sm:p-6">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <h1 className="page-title text-balance">{c.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={c.status} />
                {openRequest && (
                  <>
                    <CaseRequestBadge state={openRequest} />
                    <span className="text-xs text-slate-500">Solicitud del portal</span>
                  </>
                )}
              </div>
            </div>
            {!openRequest && <CaseStatusForm caseId={c.id} status={c.status} clientName={c.client?.name ?? null} />}
          </div>

          <dl className="grid grid-cols-2 border-t border-slate-900/[0.06] sm:grid-cols-3">
            <div className="px-5 py-3 sm:px-6">
              <dt className="text-xs text-slate-500">Cliente</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{c.client?.name ?? "Sin asignar"}</dd>
            </div>
            <div className="border-l border-slate-900/[0.06] px-5 py-3 sm:px-6">
              <dt className="text-xs text-slate-500">Abogado responsable</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{c.lawyer?.name ?? "Sin asignar"}</dd>
            </div>
            <div className="col-span-2 border-t border-slate-900/[0.06] px-5 py-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:px-6">
              <dt className="text-xs text-slate-500">Materia</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{c.matterType ?? "Sin especificar"}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-x-4 gap-y-1.5 border-t border-slate-900/[0.06] px-5 py-3 text-sm sm:flex-row sm:items-center sm:px-6">
            <span className="shrink-0 text-xs text-slate-500">Proceso judicial (SATJE)</span>
            <div className="min-w-0 flex-1">
              <ProcessNumberField caseId={c.id} processNumber={c.processNumber} />
            </div>
          </div>

          {c.requestState && c.decisionReason && (
            <p className="border-t border-slate-900/[0.06] px-5 py-3 text-xs text-slate-500 sm:px-6">
              Decisión sobre la solicitud ({c.requestState}): {c.decisionReason}
            </p>
          )}
          {c.description && (
            <p className="whitespace-pre-wrap border-t border-slate-900/[0.06] px-5 py-4 text-sm leading-relaxed text-slate-700 sm:px-6">
              {c.description}
            </p>
          )}
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <CaseNoteForm caseId={c.id} clientName={c.client?.name ?? null} />
            <CaseTimeline title="Notas y actividad" items={timeline} />
          </div>
          <div className="space-y-6">
            <CaseTasks
              caseId={c.id}
              currentUserId={userId}
              staff={staff}
              canManageHolidays={role === "ADMIN"}
              initial={c.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                dueAt: t.dueAt.toISOString(),
                done: t.done,
                assignee: t.assignee,
                termDays: t.termDays,
                notifiedOn: t.notifiedOn ? t.notifiedOn.toISOString().slice(0, 10) : null,
              }))}
            />
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
              canMarkInternal
              initial={c.documents.map((d) => ({
                ...d,
                createdAt: d.createdAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </main>
    </StaffLayout>
  );
}
