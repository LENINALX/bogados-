import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { toTimelineEvents, toTimelineNotes } from "@/lib/timeline";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseMessages } from "@/components/CaseMessages";
import { CaseDocuments } from "@/components/CaseDocuments";
import { CaseStatusForm } from "@/components/CaseStatusForm";
import { CaseNoteForm } from "@/components/CaseNoteForm";
import { CaseTasks } from "@/components/CaseTasks";
import { CaseTimeline } from "@/components/CaseTimeline";

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

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks(role)} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-brand-700">
          ← Volver
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{c.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cliente: {c.client?.name ?? "—"} · Abogado: {c.lawyer?.name ?? "—"}
              {c.matterType && <> · {c.matterType}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={c.status} />
            <CaseStatusForm caseId={c.id} status={c.status} />
          </div>
        </div>
        {c.description && (
          <p className="mt-4 rounded-lg bg-white border border-slate-200 p-4 text-sm text-slate-700">
            {c.description}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <CaseDocuments
              caseId={c.id}
              canMarkInternal
              initial={c.documents.map((d) => ({
                ...d,
                createdAt: d.createdAt.toISOString(),
              }))}
            />
            <CaseNoteForm caseId={c.id} />
            <CaseTimeline items={timeline} />
          </div>
          <div className="space-y-4">
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
          </div>
        </div>
      </main>
    </div>
  );
}
