/** Constantes y tipos compartidos del dominio Bogados */

export const CASE_STATUSES = [
  "intake",
  "abierto",
  "en_pausa",
  "cerrado",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const USER_ROLES = ["ADMIN", "ABOGADO", "CLIENTE"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  intake: "Ingreso",
  abierto: "Abierto",
  en_pausa: "En pausa",
  cerrado: "Cerrado",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  ABOGADO: "Abogado",
  CLIENTE: "Cliente",
};
