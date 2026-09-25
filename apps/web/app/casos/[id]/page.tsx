import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseMessages } from "@/components/CaseMessages";
import { CaseDocuments } from "@/components/CaseDocuments";
import { CaseStatusForm } from "@/components/CaseStatusForm";
import { CaseNoteForm } from "@/components/CaseNoteForm";
import { CaseTasks } from "@/components/CaseTasks";
import { CaseTimeline } from "@/components/CaseTimeline";
import { staffLinks } from "@/lib/nav";
import { toTimelineEvents, toTimelineNotes } from "@/lib/timeline";

type Props = { params: { id: string } };

export default async function CaseDetailPage({ params }: Props) {
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
      documents: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
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
    ...toTimelineNotes(c.notes),
    ...toTimelineEvents(c.activityEvents, "staff"),
  ];

  const sectionLabel = role === "ADMIN" ? "Casos" : "Mis casos";

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks(role)} />
      <main className="page">
        <nav aria-label="Ruta" className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-brand-700 hover:underline">
            {sectionLabel}
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-slate-700">{c.title}</span>
        </nav>

        <div className="card mb-6 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="page-title">{c.title}</h1>
                <StatusBadge status={c.status} />
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div className="flex gap-1.5">
                  <dt className="text-slate-500">Cliente:</dt>
                  <dd className="font-medium text-slate-800">{c.client?.name ?? "Sin asignar"}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-slate-500">Abogado:</dt>
                  <dd className="font-medium text-slate-800">{c.lawyer?.name ?? "Sin asignar"}</dd>
                </div>
                {c.matterType && (
                  <div className="flex gap-1.5">
                    <dt className="text-slate-500">Materia:</dt>
                    <dd className="font-medium text-slate-800">{c.matterType}</dd>
                  </div>
                )}
              </dl>
            </div>
            <CaseStatusForm caseId={c.id} status={c.status} />
          </div>
          {c.description && (
            <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700">
              {c.description}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <CaseNoteForm caseId={c.id} />
            <CaseTimeline title="Notas y actividad" items={timeline} />
          </div>
          <div className="space-y-6">
            <CaseTasks
              caseId={c.id}
              currentUserId={userId}
              staff={staff}
              initial={c.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                dueAt: t.dueAt.toISOString(),
                done: t.done,
                assignee: t.assignee,
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
    </div>
  );
}
