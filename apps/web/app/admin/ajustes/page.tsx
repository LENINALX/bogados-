import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { FirmSettings } from "@/components/admin/FirmSettings";

/** Admin › Ajustes: identidad y contacto de la firma. Se guarda en la API (PATCH /tenants/:id). */
export default async function FirmSettingsPage() {
  const session = await requireRole("ADMIN");
  const t = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      brandColor: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      website: true,
      logoPath: true,
      logoUpdatedAt: true,
    },
  });
  const { logoPath, logoUpdatedAt, ...rest } = t;

  return (
    <StaffLayout user={session.user} links={staffLinks("ADMIN")}>
      <main className="page">
        <div className="mb-6">
          <h1 className="page-title">Ajustes de la firma</h1>
          <p className="page-subtitle max-w-2xl">
            Cómo te ven tus clientes: el nombre, el logo y el color salen en los emails, en la pantalla de acceso y en
            el portal; el contacto, al pie de cada email.
          </p>
        </div>
        <FirmSettings
          initial={{ ...rest, logoVersion: logoPath && logoUpdatedAt ? logoUpdatedAt.getTime() : null }}
        />
      </main>
    </StaffLayout>
  );
}
