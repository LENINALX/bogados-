import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
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
    <div className="min-h-screen">
      <AppHeader user={session.user} links={[{ href: "/portal", label: "Mis casos" }]} />
      <main className="page max-w-3xl">
        <div className="mb-6">
          <h1 className="page-title">Hola, {firstName}</h1>
          <p className="page-subtitle">
            Aquí puedes ver el avance de tus asuntos, los documentos compartidos y escribir a tu
            abogado.
          </p>
        </div>

        {cases.length === 0 ? (
          <div className="card">
            <EmptyState
              title="Aún no tienes casos asignados"
              hint="Cuando tu abogado abra un caso a tu nombre, aparecerá aquí."
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/portal/casos/${c.id}`}
                  className="card group block p-4 transition hover:border-brand-500 hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-brand-900 group-hover:underline">{c.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Abogado: {c.lawyer?.name ?? "Por asignar"} · Actualizado{" "}
                        {c.updatedAt.toLocaleDateString("es-EC")}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-3 text-xs font-medium text-brand-700">Ver detalle →</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
