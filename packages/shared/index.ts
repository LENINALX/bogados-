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

export const APPOINTMENT_STATUSES = ["pendiente", "confirmada", "cancelada", "completada"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

/** Índice = Date.getDay() (0 = domingo) */
export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  ABOGADO: "Abogado",
  CLIENTE: "Cliente",
};
