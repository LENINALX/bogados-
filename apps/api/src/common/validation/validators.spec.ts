import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IsOptional, validate } from 'class-validator';
import {
  EmailField,
  EmptyToNull,
  IsId,
  IsIsoDateTime,
  IsYmd,
  TextField,
  isValidId,
  isValidIsoDateTime,
  isValidYmd,
} from './validators';
import { ParseIdPipe } from '../pipes/parse-id.pipe';

class Sample {
  @TextField({ label: 'Título', min: 2, max: 10 })
  title!: string;

  @IsOptional()
  @TextField({ label: 'Texto', max: 20, multiline: true })
  body?: string;

  @IsOptional()
  @EmptyToNull()
  @IsId('El caso')
  caseId?: string | null;

  @IsOptional()
  @EmailField()
  email?: string;

  @IsOptional()
  @IsYmd('date')
  date?: string;

  @IsOptional()
  @IsIsoDateTime('at')
  at?: string;
}

async function check(plain: Record<string, unknown>) {
  const dto = plainToInstance(Sample, { title: 'Hola', ...plain });
  const errors = await validate(dto);
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
  return { dto, errors, messages };
}

describe('TextField', () => {
  it('recorta espacios', async () => {
    const { dto, errors } = await check({ title: '  Demanda  ' });
    expect(errors).toHaveLength(0);
    expect(dto.title).toBe('Demanda');
  });

  it.each(['   ', '\t\n ', ' a '])('no admite «%s» como texto obligatorio', async (title) => {
    const { messages } = await check({ title });
    expect(messages).toContain('Título: escribe al menos 2 caracteres');
  });

  it('limita la longitud con mensaje en español', async () => {
    const { messages } = await check({ title: 'x'.repeat(11) });
    expect(messages).toContain('Título: máximo 10 caracteres');
  });

  it('un texto de una línea no admite saltos de línea ni caracteres de control', async () => {
    for (const title of ['Hola\nmundo', 'Hola\u0000', 'Ho\u001bla', 'abc\u202Efdp.exe']) {
      const { messages } = await check({ title });
      expect(messages).toContain('Título: no puede tener saltos de línea ni caracteres de control');
    }
  });

  it('un texto largo sí admite saltos de línea y tabuladores, pero no NUL', async () => {
    expect((await check({ body: 'línea 1\r\nlínea 2\tfin' })).errors).toHaveLength(0);
    expect((await check({ body: 'a\u0000b' })).messages).toContain('Texto: contiene caracteres no permitidos');
  });

  it('no admite números ni objetos', async () => {
    expect((await check({ title: { $ne: 1 } })).messages).toContain('Título: debe ser texto');
    expect((await check({ title: ['a', 'b'] })).messages).toContain('Título: debe ser texto');
  });
});

describe('IsId / ParseIdPipe', () => {
  it.each(['cm1abc2def3ghi4jkl5mno6pq', 'c1', 'abc_DEF-123'])('acepta %s', (id) => {
    expect(isValidId(id)).toBe(true);
  });

  it.each(['', 'a'.repeat(65), '../etc', 'a b', "1' OR '1'='1", 'id%00', 'ñ', '{"$ne":null}'])(
    'rechaza «%s»',
    (id) => {
      expect(isValidId(id)).toBe(false);
    },
  );

  it('rechaza ids que no son texto', () => {
    expect(isValidId(123)).toBe(false);
    expect(isValidId({ not: 'x' })).toBe(false);
    expect(isValidId(null)).toBe(false);
  });

  it('en el cuerpo, "" se trata como null (sin valor)', async () => {
    const { dto, errors } = await check({ caseId: '' });
    expect(errors).toHaveLength(0);
    expect(dto.caseId).toBeNull();
  });

  it('en el cuerpo, un id absurdo es un error', async () => {
    const { messages } = await check({ caseId: 'x'.repeat(10_000) });
    expect(messages).toContain('El caso no es válido');
  });

  it('el pipe deja pasar un id válido y corta el resto con 400', () => {
    const pipe = new ParseIdPipe();
    expect(pipe.transform('c123', { type: 'param', data: 'id' })).toBe('c123');
    expect(() => pipe.transform('x'.repeat(10_000), { type: 'param', data: 'id' })).toThrow(BadRequestException);
    expect(() => pipe.transform('a/b', { type: 'param', data: 'caseId' })).toThrow(
      'El identificador de la ruta no es válido (caseId)',
    );
  });
});

describe('EmailField', () => {
  it('normaliza a minúsculas y sin espacios', async () => {
    const { dto, errors } = await check({ email: '  Ana.Perez@Firma.EC ' });
    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('ana.perez@firma.ec');
  });

  it('rechaza emails no válidos o de más de 254 caracteres', async () => {
    expect((await check({ email: 'no-es-email' })).messages).toContain('Escribe un email válido, como nombre@firma.com');
    const long = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.ec`;
    expect((await check({ email: long })).errors).not.toHaveLength(0);
  });
});

describe('Fechas', () => {
  it.each(['2026-10-08', '2024-02-29', '2000-01-01', '2100-12-31'])('isValidYmd acepta %s', (d) => {
    expect(isValidYmd(d)).toBe(true);
  });

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '1999-12-31', '2101-01-01', '26-10-08', '2026-1-8'])(
    'isValidYmd rechaza %s',
    (d) => {
      expect(isValidYmd(d)).toBe(false);
    },
  );

  it.each(['2026-10-15T18:00:00.000Z', '2026-10-15T13:00:00-05:00', '2026-10-15T18:00'])(
    'isValidIsoDateTime acepta %s',
    (d) => {
      expect(isValidIsoDateTime(d)).toBe(true);
    },
  );

  it.each(['+275760-09-13T00:00:00.000Z', '0001-01-01T00:00:00Z', '2026-02-30T10:00:00Z', 'mañana', '2026-10-15T25:00:00Z'])(
    'isValidIsoDateTime rechaza %s',
    (d) => {
      expect(isValidIsoDateTime(d)).toBe(false);
    },
  );

  it('los decoradores dan un mensaje en español', async () => {
    const { messages } = await check({ date: '2026-02-30', at: '9999-01-01T00:00:00Z' });
    expect(messages.join(' ')).toMatch(/date debe ser una fecha válida con formato AAAA-MM-DD/);
    expect(messages.join(' ')).toMatch(/at debe ser una fecha ISO válida/);
  });
});
