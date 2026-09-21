import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export type AuthUser = { id: string; role: Role; tenantId: string };

/**
 * Resuelve un caso del tenant y aplica reglas de acceso por rol.
 * - ADMIN: cualquier caso del tenant
 * - ABOGADO: solo casos donde es lawyerId
 * - CLIENTE: solo casos donde es clientId
 */
export async function getAccessibleCase(caseId: string, user: AuthUser) {
  const where: {
    id: string;
    tenantId: string;
    lawyerId?: string;
    clientId?: string;
  } = { id: caseId, tenantId: user.tenantId };

  if (user.role === "ABOGADO") where.lawyerId = user.id;
  if (user.role === "CLIENTE") where.clientId = user.id;

  return prisma.case.findFirst({ where });
}

export function assertTenant(resourceTenantId: string, userTenantId: string) {
  return resourceTenantId === userTenantId;
}
