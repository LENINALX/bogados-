import { Suspense } from "react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { FirmActivity, FirmActivitySkeleton } from "@/components/admin/FirmActivity";

/**
 * Actividad de toda la firma: casos, documentos, citas, usuarios y ajustes, con quién lo hizo
 * y cuándo. El registro lo sirve la API (solo admin); aquí solo se prepara el contexto.
 */
export default async function FirmActivityPage() {
  const session = await requireRole("ADMIN");
  const { tenantId } = session.user;

  const [tenant, users] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <StaffLayout user={session.user} links={staffLinks("ADMIN")}>
      <main className="page">
        <div className="mb-6">
          <h1 className="page-title">Actividad</h1>
          <p className="page-subtitle max-w-2xl">
            Quién hizo qué y cuándo en toda la firma: casos, documentos, citas, usuarios y ajustes. Los inicios de
            sesión están en Accesos.
          </p>
        </div>

        {/* Suspense: FirmActivity lee los filtros de la URL con useSearchParams */}
        <Suspense fallback={<FirmActivitySkeleton />}>
          <FirmActivity timeZone={tenant.timezone} users={users} />
        </Suspense>
      </main>
    </StaffLayout>
  );
}
