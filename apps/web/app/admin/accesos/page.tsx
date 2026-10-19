import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { TwoFactorPolicy } from "@/components/admin/TwoFactorPolicy";
import { LoginActivity, LoginActivitySkeleton } from "@/components/admin/LoginActivity";

/**
 * Accesos de la firma: política de verificación en dos pasos y registro de inicios de
 * sesión (correctos y fallidos). El registro lo sirve la API; aquí solo se prepara el contexto.
 */
export default async function AccessPage() {
  const session = await requireRole("ADMIN");
  const { tenantId } = session.user;

  // Equipo = quienes deben usar la verificación si la firma la exige (los clientes la eligen ellos)
  const team: Prisma.UserWhereInput = { tenantId, active: true, role: { in: ["ADMIN", "ABOGADO"] } };

  const [tenant, users, teamTotal, teamWithTwoFactor] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { timezone: true, requireTwoFactor: true },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.count({ where: team }),
    prisma.user.count({ where: { ...team, twoFactorEnabled: true } }),
  ]);

  return (
    <StaffLayout user={session.user} links={staffLinks("ADMIN")}>
      <main className="page">
        <div className="mb-6">
          <h1 className="page-title">Accesos</h1>
          <p className="page-subtitle max-w-2xl">
            Quién entró a la firma, cuándo y desde dónde, y los intentos fallidos. Revísalo si alguien no reconoce un
            acceso o si ves muchos fallos seguidos.
          </p>
        </div>

        <div className="space-y-6">
          <TwoFactorPolicy
            tenantId={tenantId}
            required={tenant.requireTwoFactor}
            teamTotal={teamTotal}
            teamWithTwoFactor={teamWithTwoFactor}
          />

          {/* Suspense: LoginActivity lee los filtros de la URL con useSearchParams */}
          <Suspense fallback={<LoginActivitySkeleton />}>
            <LoginActivity timeZone={tenant.timezone} users={users} />
          </Suspense>
        </div>
      </main>
    </StaffLayout>
  );
}
