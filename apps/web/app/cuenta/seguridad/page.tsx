import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { PortalLayout } from "@/components/PortalLayout";
import { AccountSecurity } from "@/components/account/AccountSecurity";

/** Seguridad de la cuenta propia, para cualquier rol: dos pasos, contraseña y últimos accesos. */
export default async function AccountSecurityPage() {
  const session = await requireSession();
  const { role, tenantId } = session.user;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } });

  const content = (
    <main className="page">
      <div className="mb-6">
        <h1 className="page-title">Seguridad de la cuenta</h1>
        <p className="page-subtitle max-w-2xl">
          Protege tu acceso: activa la verificación en dos pasos, cambia tu contraseña y revisa desde dónde se ha entrado
          a tu cuenta.
        </p>
      </div>
      <AccountSecurity timeZone={tenant.timezone} />
    </main>
  );

  return role === "CLIENTE" ? (
    <PortalLayout user={session.user}>{content}</PortalLayout>
  ) : (
    <StaffLayout user={session.user} links={staffLinks(role)}>
      {content}
    </StaffLayout>
  );
}
