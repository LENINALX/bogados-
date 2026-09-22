import { Role } from '@prisma/client';

export function isStaff(role: Role) {
  return role === Role.ADMIN || role === Role.ABOGADO;
}

export function canManageUsers(role: Role) {
  return role === Role.ADMIN;
}

export function canCreateCase(role: Role) {
  return role === Role.ADMIN || role === Role.ABOGADO;
}
