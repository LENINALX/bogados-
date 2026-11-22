import { buildAppointmentCalendar } from './appointment-calendar';

describe('buildAppointmentCalendar', () => {
  it('genera un evento iCalendar con horas locales y la zona horaria de la firma', () => {
    const calendar = buildAppointmentCalendar(
      {
        id: 'appointment-1',
        startsAt: new Date('2026-10-05T14:00:00.000Z'),
        endsAt: new Date('2026-10-05T15:00:00.000Z'),
        status: 'confirmada',
        reason: 'Consulta inicial',
        note: null,
        lawyer: { name: 'Luis' },
        client: { name: 'Carla' },
        case: { title: 'Caso laboral' },
      },
      { name: 'Firma Demo', timezone: 'America/Guayaquil' },
      new Date('2026-10-01T12:00:00.000Z'),
    ).toString('utf8');

    expect(calendar).toContain('X-WR-TIMEZONE:America/Guayaquil');
    const unfolded = calendar.replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain('DTSTART;TZID=America/Guayaquil:20261005T090000');
    expect(unfolded).toContain('DTEND;TZID=America/Guayaquil:20261005T100000');
    expect(unfolded).toContain('SUMMARY:Cita: Carla con Luis');
    expect(unfolded).toContain('Caso: Caso laboral');
    expect(unfolded).toContain('Motivo: Consulta inicial');
    expect(unfolded).toContain('DTSTAMP:20261001T120000Z');
  });

  it('escapa contenido y pliega líneas largas sin partir caracteres UTF-8', () => {
    const calendar = buildAppointmentCalendar(
      {
        id: 'a1',
        startsAt: new Date('2026-10-05T14:00:00.000Z'),
        endsAt: new Date('2026-10-05T15:00:00.000Z'),
        status: 'pendiente',
        reason: 'Revisión, urgente; atención',
        note: null,
        lawyer: { name: 'Abogada Álvarez' },
        client: { name: 'Carla' },
        case: null,
      },
      { name: 'Firma Demo', timezone: 'America/Guayaquil' },
    ).toString('utf8');

    expect(calendar.replace(/\r\n[ \t]/g, '')).toContain('SUMMARY:Cita: Carla con Abogada Álvarez');
    expect(calendar.replace(/\r\n[ \t]/g, '')).toContain('Motivo: Revisión\\, urgente\\; atención');
    expect(calendar).toMatch(/\r\n /);
    expect(calendar.split('\r\n').every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true);
    expect(calendar).toMatch(/END:VCALENDAR\r\n$/);
  });

  it('incluye cambios de horario estacional para la zona IANA del evento', () => {
    const calendar = buildAppointmentCalendar(
      {
        id: 'a1',
        startsAt: new Date('2026-10-05T14:00:00.000Z'),
        endsAt: new Date('2026-10-05T15:00:00.000Z'),
        status: 'confirmada',
        reason: null,
        note: null,
        lawyer: { name: 'Luis' },
        client: { name: 'Carla' },
        case: null,
      },
      { name: 'Firma Demo', timezone: 'America/New_York' },
    ).toString('utf8');

    expect(calendar).toContain('BEGIN:DAYLIGHT');
    expect(calendar).toContain('BEGIN:STANDARD');
    expect(calendar.replace(/\r\n[ \t]/g, '')).toContain('DTSTART;TZID=America/New_York:20261005T100000');
  });
});
