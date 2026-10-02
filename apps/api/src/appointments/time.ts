/**
 * Utilidades de horario sin dependencias: la disponibilidad se guarda en hora
 * local de la firma (minutos desde las 00:00 de cada día de la semana) y las
 * citas en UTC. Todo el cálculo de huecos se hace en el servidor.
 */

export type Block = { weekday: number; startMin: number; endMin: number };
export type Interval = { startsAt: Date; endsAt: Date };

const MINUTES_IN_DAY = 24 * 60;

/** "09:30" → 570. Devuelve null si el formato no es HH:MM válido (24:00 se admite como fin de día). */
export function parseHHMM(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59 || h > 24 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

/** 570 → "09:30" */
export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Diferencia (ms) entre la hora local de `timeZone` y UTC en el instante `at`. */
function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Instante UTC que corresponde a `minutes` del día `ymd` (YYYY-MM-DD) en `timeZone`. */
export function zonedToUtc(ymd: string, minutes: number, timeZone: string): Date {
  const [y, mo, d] = ymd.split('-').map(Number);
  const naive = Date.UTC(y, mo - 1, d, 0, minutes);
  // Segunda pasada: corrige si el cambio de horario (DST) cae entre medias
  const first = naive - tzOffsetMs(new Date(naive), timeZone);
  return new Date(naive - tzOffsetMs(new Date(first), timeZone));
}

/** Fecha local (YYYY-MM-DD) de `at` en `timeZone`. */
export function localYmd(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado */
export function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/** Mensaje de error si las franjas no son válidas o se solapan dentro del mismo día. */
export function validateBlocks(blocks: Block[]): string | null {
  for (const b of blocks) {
    if (!Number.isInteger(b.weekday) || b.weekday < 0 || b.weekday > 6) return 'Día de la semana no válido';
    if (b.startMin < 0 || b.endMin > MINUTES_IN_DAY || b.startMin >= b.endMin) {
      return 'Cada franja debe terminar después de empezar';
    }
  }
  const sorted = [...blocks].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.weekday === cur.weekday && cur.startMin < prev.endMin) {
      return 'Hay franjas que se solapan el mismo día';
    }
  }
  return null;
}

/**
 * Huecos reservables: franjas de `slotMinutes` dentro de la disponibilidad,
 * a partir de `now`, que no se solapan con citas activas (`busy`).
 */
export function computeSlots(params: {
  blocks: Block[];
  busy: Interval[];
  fromYmd: string;
  days: number;
  timeZone: string;
  slotMinutes: number;
  now: Date;
}): Interval[] {
  const { blocks, busy, fromYmd, days, timeZone, slotMinutes, now } = params;
  const slots: Interval[] = [];
  for (let i = 0; i < days; i++) {
    const ymd = addDaysYmd(fromYmd, i);
    const weekday = weekdayOfYmd(ymd);
    const dayBlocks = blocks
      .filter((b) => b.weekday === weekday)
      .sort((a, b) => a.startMin - b.startMin);
    for (const block of dayBlocks) {
      for (let m = block.startMin; m + slotMinutes <= block.endMin; m += slotMinutes) {
        const slot = {
          startsAt: zonedToUtc(ymd, m, timeZone),
          endsAt: zonedToUtc(ymd, m + slotMinutes, timeZone),
        };
        if (slot.startsAt <= now) continue;
        if (busy.some((b) => overlaps(slot, b))) continue;
        slots.push(slot);
      }
    }
  }
  return slots;
}
