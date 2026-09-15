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
    },
  });

  if (!c) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader
        user={session.user}
        links={[{ href: "/dashboard", label: "Casos" }]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-brand-700">
          ← Volver
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{c.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cliente: {c.client?.name ?? "—"} · Abogado: {c.lawyer?.name ?? "—"}
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
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b px-4 py-3 text-sm font-semibold">Timeline / notas</div>
              <ul className="divide-y max-h-96 overflow-y-auto">
                {c.notes.length === 0 && (
                  <li className="px-4 py-6 text-sm text-slate-400">Sin notas</li>
                )}
                {c.notes.map((n) => (
                  <li key={n.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>
                        {n.author.name}
                        {n.isInternal ? (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-800">
                            Interna
                          </span>
                        ) : (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 text-emerald-800">
                            Cliente
                          </span>
                        )}
                      </span>
                      <span>{n.createdAt.toLocaleString("es-EC")}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{n.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
