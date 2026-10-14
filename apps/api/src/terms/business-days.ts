import { addDaysYmd, weekdayOfYmd } from '../appointments/time';

/**
 * Términos procesales en días hábiles.
 *
 * Un término se cuenta desde el día siguiente a la notificación y solo avanza en días hábiles:
 * se saltan sábados, domingos y los feriados del bufete. El vencimiento es el último día
 * hábil contado. El resultado incluye el desglose (contados y saltados) para que el abogado
 * vea cómo se calculó y lo confirme: el sistema propone, no decide.
 */

export type SkippedDay = { date: string; reason: string };

export type TermBreakdown = {
  /** Fecha de la notificación (YYYY-MM-DD); no cuenta */
  notifiedOn: string;
  /** Días hábiles del término */
  days: number;
  /** Último día hábil del término (YYYY-MM-DD) */
  dueOn: string;
  /** Días hábiles contados, en orden */
  counted: string[];
  /** Días no hábiles que se saltaron entre la notificación y el vencimiento */
  skipped: SkippedDay[];
};

export const MAX_TERM_DAYS = 90;
export const YMD = /^\d{4}-\d{2}-\d{2}$/;

const WEEKEND: Record<number, string> = { 0: 'Domingo', 6: 'Sábado' };

/**
 * @param holidays feriados del bufete: fecha (YYYY-MM-DD) → nombre
 */
export function computeTermDeadline(
  notifiedOn: string,
  days: number,
  holidays: ReadonlyMap<string, string>,
): TermBreakdown {
  if (!YMD.test(notifiedOn)) throw new RangeError('La fecha de notificación debe tener el formato AAAA-MM-DD');
  if (!Number.isInteger(days) || days < 1 || days > MAX_TERM_DAYS) {
    throw new RangeError(`El término debe ser de 1 a ${MAX_TERM_DAYS} días hábiles`);
  }

  const counted: string[] = [];
  const skipped: SkippedDay[] = [];
  let day = notifiedOn;
  while (counted.length < days) {
    day = addDaysYmd(day, 1);
    const weekend = WEEKEND[weekdayOfYmd(day)];
    if (weekend) skipped.push({ date: day, reason: weekend });
    else if (holidays.has(day)) skipped.push({ date: day, reason: holidays.get(day)! });
    else counted.push(day);
  }
  return { notifiedOn, days, dueOn: counted[counted.length - 1], counted, skipped };
}

/**
 * Rango de fechas que puede abarcar un término: lo bastante amplio para cubrir fines de
 * semana y feriados encadenados (p. ej. Navidad + Año Nuevo, Carnaval).
 */
export function termSearchWindow(notifiedOn: string, days: number): { from: string; to: string } {
  return { from: addDaysYmd(notifiedOn, 1), to: addDaysYmd(notifiedOn, days * 2 + 30) };
}

/** Domingo de Pascua (algoritmo gregoriano anónimo de Meeus/Jones/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Feriados nacionales de Ecuador en su fecha original. Los traslados que decreta el Gobierno
 * cada año y los feriados locales (fundación del cantón, etc.) los ajusta el administrador.
 */
export function ecuadorNationalHolidays(year: number): { date: string; name: string }[] {
  const easter = easterSunday(year);
  const fixed = (md: string, name: string) => ({ date: `${year}-${md}`, name });
  return [
    fixed('01-01', 'Año Nuevo'),
    { date: addDaysYmd(easter, -48), name: 'Carnaval (lunes)' },
    { date: addDaysYmd(easter, -47), name: 'Carnaval (martes)' },
    { date: addDaysYmd(easter, -2), name: 'Viernes Santo' },
    fixed('05-01', 'Día del Trabajo'),
    fixed('05-24', 'Batalla de Pichincha'),
    fixed('08-10', 'Primer Grito de Independencia'),
    fixed('10-09', 'Independencia de Guayaquil'),
    fixed('11-02', 'Día de los Difuntos'),
    fixed('11-03', 'Independencia de Cuenca'),
    fixed('12-25', 'Navidad'),
  ].sort((x, y) => x.date.localeCompare(y.date));
}
