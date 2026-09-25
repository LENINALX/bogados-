import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { AppHeader } from "@/components/AppHeader";
import { NewCaseForm } from "@/components/NewCaseForm";

export default async function NewCasePage() {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;

  const [lawyers, clients] = await Promise.all([
    role === "ADMIN"
      ? prisma.user.findMany({
          where: { tenantId, active: true, role: { in: ["ADMIN", "ABOGADO"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { tenantId, active: true, role: "CLIENTE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks(role)} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-brand-700">
          ← Volver
        </Link>
        <h1 className="mb-6 mt-4 text-2xl font-bold text-brand-900">Nuevo caso</h1>
        <NewCaseForm
          lawyers={lawyers}
          clients={clients}
          canPickLawyer={role === "ADMIN"}
          currentUserId={userId}
        />
      </main>
    </div>
  );
}
