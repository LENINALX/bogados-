type CalendarAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  reason: string | null;
  note: string | null;
  lawyer: { name: string };
  client: { name: string };
  case: { title: string } | null;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsAt(value: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

function localDate(value: Date, timeZone: string): string {
  const parts = partsAt(value, timeZone);
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}${pad(parts.second)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function offsetAt(value: Date, timeZone: string): number {
  const parts = partsAt(value, timeZone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - Math.floor(value.getTime() / 1000) * 1000;
}

function utcOffset(value: number): string {
  const sign = value < 0 ? '-' : '+';
  const minutes = Math.abs(value) / 60_000;
  return `${sign}${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`;
}

function timezoneComponent(timeZone: string, eventDate: Date): string[] {
  const year = eventDate.getUTCFullYear();
  const rangeStart = Date.UTC(year - 1, 0, 1);
  const rangeEnd = Date.UTC(year + 2, 0, 1);
  const initialOffset = offsetAt(new Date(rangeStart), timeZone);
  const observances = new Map<number, { from: number; to: number }>();
  const step = 12 * 60 * 60 * 1000;

  let previousAt = rangeStart;
  let previousOffset = initialOffset;
  for (let sample = Math.min(previousAt + step, rangeEnd); sample <= rangeEnd; sample = Math.min(sample + step, rangeEnd)) {
    const sampleOffset = offsetAt(new Date(sample), timeZone);
    if (sampleOffset !== previousOffset) {
      let low = previousAt;
      let high = sample;
      while (high - low > 1000) {
        const middle = Math.floor((low + high) / 2000) * 1000;
        if (offsetAt(new Date(middle), timeZone) === previousOffset) low = middle;
        else high = middle;
      }
      const transitionAt = high;
      observances.set(transitionAt, { from: previousOffset, to: sampleOffset });
    }
    previousAt = sample;
    previousOffset = sampleOffset;
    if (sample === rangeEnd) break;
  }

  const lines = ['BEGIN:VTIMEZONE', `TZID:${timeZone}`, `X-LIC-LOCATION:${timeZone}`];
  if (observances.size === 0) {
    const start = localDate(new Date(rangeStart), timeZone);
    lines.push('BEGIN:STANDARD', `DTSTART:${start}`, `TZOFFSETFROM:${utcOffset(initialOffset)}`, `TZOFFSETTO:${utcOffset(initialOffset)}`, 'END:STANDARD');
  } else {
    for (const [at, { from, to }] of observances) {
      const kind = to > from ? 'DAYLIGHT' : 'STANDARD';
      const transitionLocal = new Date(at + from);
      lines.push(
        `BEGIN:${kind}`,
        `DTSTART:${localDate(transitionLocal, 'UTC')}`,
        `TZOFFSETFROM:${utcOffset(from)}`,
        `TZOFFSETTO:${utcOffset(to)}`,
        `END:${kind}`,
      );
    }
  }
  lines.push('END:VTIMEZONE');
  return lines;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function utcDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function foldLine(line: string): string {
  const folded: string[] = [];
  let current = '';
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character, 'utf8');
    if (bytes + size > 75) {
      folded.push(current);
      current = ` ${character}`;
      bytes = size + 1;
    } else {
      current += character;
      bytes += size;
    }
  }
  folded.push(current);
  return folded.join('\r\n');
}

export function buildAppointmentCalendar(
  appointment: CalendarAppointment,
  firm: { name: string; timezone: string },
  now = new Date(),
): Buffer {
  const summary = `Cita: ${appointment.client.name} con ${appointment.lawyer.name}`;
  const description = [
    `Firma: ${firm.name}`,
    `Abogado: ${appointment.lawyer.name}`,
    `Cliente: ${appointment.client.name}`,
    ...(appointment.case ? [`Caso: ${appointment.case.title}`] : []),
    ...(appointment.reason ? [`Motivo: ${appointment.reason}`] : []),
    ...(appointment.note ? [`Comentario: ${appointment.note}`] : []),
    `Estado: ${appointment.status}`,
    `Zona horaria: ${firm.timezone}`,
  ].join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Bogados//Citas//ES',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(firm.name)}`,
    `X-WR-TIMEZONE:${firm.timezone}`,
    ...timezoneComponent(firm.timezone, appointment.startsAt),
    'BEGIN:VEVENT',
    `UID:${appointment.id}@bogados`,
    `DTSTAMP:${utcDate(now)}`,
    `DTSTART;TZID=${firm.timezone}:${localDate(appointment.startsAt, firm.timezone)}`,
    `DTEND;TZID=${firm.timezone}:${localDate(appointment.endsAt, firm.timezone)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];

  return Buffer.from(lines.map(foldLine).join('\r\n'), 'utf8');
}
