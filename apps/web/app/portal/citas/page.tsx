import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalLayout } from "@/components/PortalLayout";
import { ClientAgenda } from "@/components/AgendaBoard";

export default async function PortalAppointmentsPage() {
  const session = await requireRole("CLIENTE");
  const { tenantId, id: userId } = session.user;

  const [tenant, cases] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } }),
    prisma.case.findMany({
      where: { tenantId, clientId: userId, status: { not: "cerrado" } },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <PortalLayout user={session.user}>
      <main className="page">
        <div className="mb-6">
          <h1 className="page-title">Mis citas</h1>
          <p className="page-subtitle">Pide una cita con tu abogado y consulta las que tienes programadas</p>
        </div>
        <ClientAgenda timeZone={tenant.timezone} cases={cases} />
      </main>
    </PortalLayout>
  );
}
