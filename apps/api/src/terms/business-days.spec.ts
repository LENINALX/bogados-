import {
  computeTermDeadline,
  easterSunday,
  ecuadorNationalHolidays,
  termSearchWindow,
} from './business-days';

const none = new Map<string, string>();

describe('computeTermDeadline', () => {
  it('no cuenta el día de la notificación y salta el fin de semana', () => {
    // Jueves 8 → viernes 9 (1), lunes 12 (2), martes 13 (3)
    const r = computeTermDeadline('2026-10-08', 3, none);
    expect(r.dueOn).toBe('2026-10-13');
    expect(r.counted).toEqual(['2026-10-09', '2026-10-12', '2026-10-13']);
    expect(r.skipped).toEqual([
      { date: '2026-10-10', reason: 'Sábado' },
      { date: '2026-10-11', reason: 'Domingo' },
    ]);
  });

  it('salta los feriados y dice cuál', () => {
    const holidays = new Map([['2026-10-09', 'Independencia de Guayaquil']]);
    const r = computeTermDeadline('2026-10-08', 3, holidays);
    expect(r.dueOn).toBe('2026-10-14');
    expect(r.skipped[0]).toEqual({ date: '2026-10-09', reason: 'Independencia de Guayaquil' });
  });

  it('encadena feriados de fin de año', () => {
    const holidays = new Map([
      ['2026-12-25', 'Navidad'],
      ['2027-01-01', 'Año Nuevo'],
    ]);
    // Jueves 24 → (25 feriado, 26-27 fin de semana) lunes 28, martes 29, miércoles 30
    const r = computeTermDeadline('2026-12-24', 3, holidays);
    expect(r.dueOn).toBe('2026-12-30');
    // 5 días: … jueves 31, (1 feriado, 2-3 fin de semana) lunes 4
    expect(computeTermDeadline('2026-12-24', 5, holidays).dueOn).toBe('2027-01-04');
  });

  it('un término de 1 día notificado el viernes vence el lunes', () => {
    expect(computeTermDeadline('2026-10-09', 1, none).dueOn).toBe('2026-10-12');
  });

  it('rechaza fechas y términos no válidos', () => {
    expect(() => computeTermDeadline('09/10/2026', 3, none)).toThrow(RangeError);
    expect(() => computeTermDeadline('2026-10-08', 0, none)).toThrow(RangeError);
    expect(() => computeTermDeadline('2026-10-08', 2.5, none)).toThrow(RangeError);
    expect(() => computeTermDeadline('2026-10-08', 91, none)).toThrow(RangeError);
  });

  it('la ventana de búsqueda de feriados cubre el vencimiento', () => {
    const r = computeTermDeadline('2026-12-24', 10, new Map([['2026-12-25', 'Navidad']]));
    const w = termSearchWindow('2026-12-24', 10);
    expect(w.from <= r.counted[0]).toBe(true);
    expect(w.to >= r.dueOn).toBe(true);
  });
});

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('Pascua de %i', (year, date) => {
    expect(easterSunday(year)).toBe(date);
  });
});

describe('ecuadorNationalHolidays', () => {
  it('incluye Carnaval y Viernes Santo según la Pascua', () => {
    const h2026 = ecuadorNationalHolidays(2026);
    expect(h2026).toContainEqual({ date: '2026-02-16', name: 'Carnaval (lunes)' });
    expect(h2026).toContainEqual({ date: '2026-02-17', name: 'Carnaval (martes)' });
    expect(h2026).toContainEqual({ date: '2026-04-03', name: 'Viernes Santo' });
    const h2025 = ecuadorNationalHolidays(2025);
    expect(h2025).toContainEqual({ date: '2025-03-03', name: 'Carnaval (lunes)' });
    expect(h2025).toContainEqual({ date: '2025-04-18', name: 'Viernes Santo' });
  });

  it('devuelve 11 feriados ordenados por fecha y sin repetir', () => {
    const list = ecuadorNationalHolidays(2026);
    expect(list).toHaveLength(11);
    expect(list.map((h) => h.date)).toEqual([...list.map((h) => h.date)].sort());
    expect(new Set(list.map((h) => h.date)).size).toBe(11);
  });
});
