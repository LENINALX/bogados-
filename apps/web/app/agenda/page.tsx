import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { StaffAgenda } from "@/components/AgendaBoard";

export default async function AgendaPage() {
  const session = await requireRole("ADMIN", "ABOGADO");
  const { tenantId, role, id: userId } = session.user;
  const isAdmin = role === "ADMIN";

  const [tenant, clients, cases, lawyers] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } }),
    prisma.user.findMany({
      where: { tenantId, role: "CLIENTE", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.case.findMany({
      where: { tenantId, status: { not: "cerrado" }, ...(isAdmin ? {} : { lawyerId: userId }) },
      select: { id: true, title: true, clientId: true },
      orderBy: { updatedAt: "desc" },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { tenantId, active: true, role: { in: ["ADMIN", "ABOGADO"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
  ]);

  return (
    <StaffLayout user={session.user} links={staffLinks(role)}>
      <main className="page">
        <div className="mb-6">
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            {isAdmin ? "Citas de toda la firma" : "Tus citas con clientes"} · confirma las solicitudes y define tu
            disponibilidad
          </p>
        </div>
        <StaffAgenda
          timeZone={tenant.timezone}
          currentUserId={userId}
          lawyers={lawyers}
          clients={clients}
          cases={cases}
        />
      </main>
    </StaffLayout>
  );
}
