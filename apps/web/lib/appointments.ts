import type { AppointmentStatus } from "@bogados/shared";

export type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  note: string | null;
  lawyer: { id: string; name: string };
  client: { id: string; name: string; email: string };
  case: { id: string; title: string } | null;
};

export type Slot = { startsAt: string; endsAt: string };
export type SlotsResponse = { timeZone: string; slotMinutes: number; slots: Slot[] };

/** Fecha local (YYYY-MM-DD) en la zona horaria de la firma. */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** "09:00" en la zona horaria de la firma. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** "lunes, 5 de octubre" en la zona horaria de la firma. */
export function formatDay(iso: string, timeZone: string): string {
  const s = new Intl.DateTimeFormat("es-EC", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Agrupa por día local manteniendo el orden de entrada. */
export function groupByDay<T extends { startsAt: string }>(items: T[], timeZone: string) {
  const groups: { day: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const day = dayKey(item.startsAt, timeZone);
    let group = groups.find((g) => g.day === day);
    if (!group) {
      group = { day, label: formatDay(item.startsAt, timeZone), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export const STATUS_BADGE: Record<AppointmentStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  cancelada: "bg-slate-100 text-slate-500 line-through",
  completada: "bg-sky-100 text-sky-800",
};
