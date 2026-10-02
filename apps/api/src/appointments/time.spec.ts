import {
  addDaysYmd,
  computeSlots,
  formatHHMM,
  localYmd,
  overlaps,
  parseHHMM,
  validateBlocks,
  weekdayOfYmd,
  zonedToUtc,
} from './time';

const GYE = 'America/Guayaquil'; // UTC-5, sin horario de verano
const MAD = 'Europe/Madrid'; // con horario de verano

describe('parseHHMM / formatHHMM', () => {
  it.each([
    ['00:00', 0],
    ['09:30', 570],
    ['24:00', 1440],
  ])('%s → %i', (txt, min) => {
    expect(parseHHMM(txt)).toBe(min);
    expect(formatHHMM(min)).toBe(txt);
  });

  it.each(['9:30', '25:00', '24:30', '12:60', 'aa:bb', ''])('rechaza "%s"', (txt) => {
    expect(parseHHMM(txt)).toBeNull();
  });
});

describe('fechas en zona horaria de la firma', () => {
  it('zonedToUtc: 09:00 en Guayaquil = 14:00 UTC', () => {
    expect(zonedToUtc('2026-10-05', 9 * 60, GYE).toISOString()).toBe('2026-10-05T14:00:00.000Z');
  });

  it('zonedToUtc respeta el horario de verano de Madrid', () => {
    expect(zonedToUtc('2026-07-01', 9 * 60, MAD).toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(zonedToUtc('2026-12-01', 9 * 60, MAD).toISOString()).toBe('2026-12-01T08:00:00.000Z');
  });

  it('localYmd: las 03:00 UTC aún son el día anterior en Guayaquil', () => {
    expect(localYmd(new Date('2026-10-06T03:00:00Z'), GYE)).toBe('2026-10-05');
  });

  it('addDaysYmd y weekdayOfYmd cruzan meses y años', () => {
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekdayOfYmd('2026-10-05')).toBe(1); // lunes
    expect(weekdayOfYmd('2026-10-04')).toBe(0); // domingo
  });
});

describe('validateBlocks', () => {
  it('acepta franjas válidas, incluidas varias el mismo día sin solaparse', () => {
    expect(
      validateBlocks([
        { weekday: 1, startMin: 540, endMin: 780 },
        { weekday: 1, startMin: 900, endMin: 1080 },
        { weekday: 2, startMin: 540, endMin: 780 },
      ]),
    ).toBeNull();
  });

  it('franjas contiguas no cuentan como solapadas', () => {
    expect(
      validateBlocks([
        { weekday: 1, startMin: 540, endMin: 600 },
        { weekday: 1, startMin: 600, endMin: 660 },
      ]),
    ).toBeNull();
  });

  it.each([
    [[{ weekday: 7, startMin: 0, endMin: 60 }], 'Día'],
    [[{ weekday: 1, startMin: 600, endMin: 600 }], 'terminar'],
    [[{ weekday: 1, startMin: 0, endMin: 1500 }], 'terminar'],
    [
      [
        { weekday: 1, startMin: 540, endMin: 720 },
        { weekday: 1, startMin: 700, endMin: 800 },
      ],
      'solapan',
    ],
  ])('rechaza %j', (blocks, msg) => {
    expect(validateBlocks(blocks)).toContain(msg);
  });
});

describe('computeSlots', () => {
  // Lunes 2026-10-05, 09:00–12:00 hora de Guayaquil, citas de 60 min
  const blocks = [{ weekday: 1, startMin: 9 * 60, endMin: 12 * 60 }];
  const base = {
    blocks,
    busy: [],
    fromYmd: '2026-10-05',
    days: 1,
    timeZone: GYE,
    slotMinutes: 60,
    now: new Date('2026-10-01T00:00:00Z'),
  };
  const iso = (slots: { startsAt: Date }[]) => slots.map((s) => s.startsAt.toISOString());

  it('genera los huecos de la franja en UTC', () => {
    expect(iso(computeSlots(base))).toEqual([
      '2026-10-05T14:00:00.000Z',
      '2026-10-05T15:00:00.000Z',
      '2026-10-05T16:00:00.000Z',
    ]);
  });

  it('no ofrece huecos ya pasados ni el que está empezando', () => {
    const now = new Date('2026-10-05T15:00:00Z'); // 10:00 local
    expect(iso(computeSlots({ ...base, now }))).toEqual(['2026-10-05T16:00:00.000Z']);
  });

  it('quita los huecos ocupados por citas activas (también solapes parciales)', () => {
    const busy = [
      { startsAt: new Date('2026-10-05T14:30:00Z'), endsAt: new Date('2026-10-05T15:30:00Z') },
    ];
    expect(iso(computeSlots({ ...base, busy }))).toEqual(['2026-10-05T16:00:00.000Z']);
  });

  it('una franja que no da para una cita completa no genera hueco', () => {
    const short = [{ weekday: 1, startMin: 9 * 60, endMin: 9 * 60 + 45 }];
    expect(computeSlots({ ...base, blocks: short })).toEqual([]);
  });

  it('recorre varios días y solo usa los días con disponibilidad', () => {
    const slots = computeSlots({ ...base, fromYmd: '2026-10-04', days: 8 }); // dom 4 → dom 11
    expect(slots).toHaveLength(3); // solo el lunes 5 (el lunes 12 queda fuera)
  });

  it('overlaps: intervalos contiguos no se solapan', () => {
    const a = { startsAt: new Date(0), endsAt: new Date(1000) };
    expect(overlaps(a, { startsAt: new Date(1000), endsAt: new Date(2000) })).toBe(false);
    expect(overlaps(a, { startsAt: new Date(999), endsAt: new Date(2000) })).toBe(true);
  });
});
