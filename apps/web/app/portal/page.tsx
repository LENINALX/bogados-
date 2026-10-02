import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalLayout } from "@/components/PortalLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseRequestBadge } from "@/components/CaseRequestBadge";
import { EmptyState } from "@/components/ui";

export default async function PortalPage() {
  const session = await requireRole("CLIENTE");
  const cases = await prisma.case.findMany({
    where: { tenantId: session.user.tenantId, clientId: session.user.id },
    include: { lawyer: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const firstName = session.user.name.split(" ")[0];

  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Hola, {firstName}</h1>
            <p className="page-subtitle">
              Aquí puedes ver el avance de tus asuntos, los documentos compartidos y escribir a tu
              abogado.
            </p>
          </div>
          <Link href="/portal/solicitar" className="btn-primary">
            + Solicitar un caso
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="card">
            <EmptyState
              title="Aún no tienes casos"
              hint="Solicita uno describiendo tu situación, o espera a que tu abogado abra un caso a tu nombre."
              action={{ href: "/portal/solicitar", label: "Solicitar un caso" }}
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {cases.map((c) => {
              // Mientras la solicitud no esté aceptada, su estado es lo relevante para el cliente
              const request = c.requestState && c.requestState !== "aceptada" ? c.requestState : null;
              return (
                <li key={c.id}>
                  <Link
                    href={`/portal/casos/${c.id}`}
                    className="card group block p-4 transition hover:border-brand-500 hover:shadow-md sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-brand-900 group-hover:underline">{c.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {request
                            ? `Solicitado el ${c.createdAt.toLocaleDateString("es-EC")}`
                            : `Abogado: ${c.lawyer?.name ?? "Por asignar"} · Actualizado ${c.updatedAt.toLocaleDateString("es-EC")}`}
                        </div>
                      </div>
                      {request ? <CaseRequestBadge state={request} /> : <StatusBadge status={c.status} />}
                    </div>
                    <div className="mt-3 text-xs font-medium text-brand-700">Ver detalle →</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </PortalLayout>
  );
}
