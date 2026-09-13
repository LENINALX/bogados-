import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";

export default async function PortalPage() {
  const session = await requireRole("CLIENTE");
  const cases = await prisma.case.findMany({
    where: { tenantId: session.user.tenantId, clientId: session.user.id },
    include: { lawyer: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <AppHeader
        user={session.user}
        links={[{ href: "/portal", label: "Mis casos" }]}
      />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-brand-900">Portal del cliente</h1>
        <p className="mb-6 text-sm text-slate-500">
          Consulta el avance de tus asuntos, documentos compartidos y mensajes.
        </p>
        <ul className="space-y-3">
          {cases.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
              Aún no tienes casos asignados
            </li>
          )}
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/portal/casos/${c.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-brand-900">{c.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Abogado: {c.lawyer?.name ?? "Por asignar"}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
