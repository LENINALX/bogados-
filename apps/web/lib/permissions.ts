import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  tenantId: string;
};

/** Staff de la firma (ve notas internas y docs no compartidos). */
export function isStaff(role: Role) {
  return role === "ADMIN" || role === "ABOGADO";
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canCreateCase(role: Role) {
  return role === "ADMIN" || role === "ABOGADO";
}

export function canUploadInternalDoc(role: Role) {
  return role === "ADMIN" || role === "ABOGADO";
}
