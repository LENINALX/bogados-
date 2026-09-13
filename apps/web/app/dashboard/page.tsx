import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CASE_STATUS_LABELS, CaseStatus } from "@bogados/shared";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;

  const status = searchParams.status as CaseStatus | undefined;
  const q = searchParams.q?.trim();

  const where: Record<string, unknown> = { tenantId };
  if (role === "ABOGADO") where.lawyerId = userId;
  if (status && Object.keys(CASE_STATUS_LABELS).includes(status)) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const cases = await prisma.case.findMany({
    where,
    include: {
      client: { select: { name: true } },
      lawyer: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const counts = await prisma.case.groupBy({
    by: ["status"],
    where: role === "ABOGADO" ? { tenantId, lawyerId: userId } : { tenantId },
    _count: true,
  });

  const links =
    role === "ADMIN"
      ? [
          { href: "/dashboard", label: "Casos" },
        ]
      : [{ href: "/dashboard", label: "Mis casos" }];

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={links} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">
              {role === "ADMIN" ? "Panel de la firma" : "Mis expedientes"}
            </h1>
            <p className="text-sm text-slate-500">
              {cases.length} caso{cases.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {counts.map((c) => (
            <Link
              key={c.status}
              href={`/dashboard?status=${c.status}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-500"
            >
              {CASE_STATUS_LABELS[c.status as CaseStatus]} ({c._count})
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 hover:border-brand-500"
          >
            Todos
          </Link>
        </div>

        <form className="mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por título…"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Caso</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Abogado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No hay casos con estos filtros
                  </td>
                </tr>
              )}
              {cases.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.title}
                    </Link>
                    {c.matterType && (
                      <div className="text-xs text-slate-400">{c.matterType}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.lawyer?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.updatedAt.toLocaleDateString("es-EC")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
