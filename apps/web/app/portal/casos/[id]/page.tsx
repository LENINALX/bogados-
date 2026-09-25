import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseMessages } from "@/components/CaseMessages";
import { CaseDocuments } from "@/components/CaseDocuments";
import { CaseTimeline } from "@/components/CaseTimeline";
import { toTimelineEvents, toTimelineNotes } from "@/lib/timeline";

type Props = { params: { id: string } };

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
      documents: {
        where: { sharedWithClient: true },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      activityEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!c) notFound();

  // Notas ya filtradas (isInternal=false); eventos por lista blanca de cliente
  const timeline = [
    ...toTimelineNotes(c.notes),
    ...toTimelineEvents(c.activityEvents, "client"),
  ];

  return (
    <div className="min-h-screen">
      <AppHeader
        user={session.user}
        links={[{ href: "/portal", label: "Mis casos" }]}
      />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/portal" className="text-sm text-slate-500 hover:text-brand-700">
          ← Mis casos
        </Link>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{c.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Abogado: {c.lawyer?.name ?? "Por asignar"}
            </p>
          </div>
          <StatusBadge status={c.status} />
        </div>
        {c.description && (
          <p className="mt-4 text-sm text-slate-700">{c.description}</p>
        )}

        <div className="mt-8 space-y-6">
          <CaseTimeline title="Avances del caso" items={timeline} audience="client" />

          <CaseDocuments
            caseId={c.id}
            canMarkInternal={false}
            initial={c.documents.map((d) => ({
              ...d,
              createdAt: d.createdAt.toISOString(),
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
      </main>
    </div>
  );
}
