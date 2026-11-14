import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import { buildPdf, buildXlsx, ExportTable, pdfText } from './export-files';
import { EXPORT_MAX_ROWS, ExportsService } from './exports.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

const table = (rows: ExportTable['rows']): ExportTable => ({
  title: 'Casos',
  firmName: 'Firma Demo',
  details: ['Casos de toda la firma', '2 casos'],
  columns: [
    { header: 'Título', width: 40 },
    { header: 'Casos', width: 10, kind: 'number' },
    { header: 'Abierto', width: 12, kind: 'date' },
  ],
  rows,
});

async function readXlsx(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  return wb;
}

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;

describe('buildXlsx', () => {
  it('cabecera, tipos de celda y hoja de información', async () => {
    const wb = await readXlsx(await buildXlsx(table([['Demanda laboral', 3, '2026-11-05'], ['Sin fecha', 0, null]])));
    const ws = wb.getWorksheet('Casos')!;
    expect(ws.getRow(1).values).toEqual([undefined, 'Título', 'Casos', 'Abierto']);
    expect(ws.getCell('A2').value).toBe('Demanda laboral');
    expect(ws.getCell('B2').value).toBe(3);
    // Fecha de verdad (se puede ordenar y filtrar), en el día exacto
    expect((ws.getCell('C2').value as Date).toISOString()).toBe('2026-11-05T00:00:00.000Z');
    expect(ws.getCell('C3').value).toBeNull();
    expect(ws.autoFilter).toBeTruthy();
    expect(wb.getWorksheet('Información')!.getCell('A1').value).toBe('Firma Demo');
  });

  it('un texto que parece fórmula se guarda como texto, no se ejecuta', async () => {
    const wb = await readXlsx(await buildXlsx(table([['=HYPERLINK("http://x","clic")', 1, null], ['+1+1', 1, null]])));
    const cell = wb.getWorksheet('Casos')!.getCell('A2');
    expect(cell.type).toBe(ExcelJS.ValueType.String);
    expect(cell.formula).toBeUndefined();
    expect(cell.value).toBe('=HYPERLINK("http://x","clic")');
  });
});

describe('buildPdf', () => {
  it('genera un PDF válido de una página', async () => {
    const pdf = await buildPdf(table([['Demanda laboral — despido', 3, '2026-11-05']]));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(1);
  });

  it('muchas filas: pagina sin que el pie abra páginas de más', async () => {
    const rows = Array.from({ length: 120 }, (_, i) => [`Caso ${i + 1}`, i, '2026-11-05'] as ExportTable['rows'][number]);
    const pages = pageCount(await buildPdf(table(rows)));
    expect(pages).toBeGreaterThanOrEqual(3);
    expect(pages).toBeLessThanOrEqual(6);
  });

  it('sin filas también es un PDF válido', async () => {
    expect(pageCount(await buildPdf(table([])))).toBe(1);
  });

  it('pdfText conserva tildes y ñ, y sustituye lo que la fuente no tiene', () => {
    expect(pdfText('Acción de protección — «Núñez» €')).toBe('Acción de protección — «Núñez» €');
    expect(pdfText('línea 1\nlínea 2\t☺ 日本')).toBe('línea 1 línea 2 ? ??');
    // «e» + acento combinado se compone en «é»
    expect(pdfText('café')).toBe('café');
  });
});

describe('ExportsService', () => {
  const admin: JwtPayloadUser = { id: 'admin1', role: Role.ADMIN, tenantId: 't1', email: 'a@x.ec', name: 'Nombre Admin' };
  const lawyer: JwtPayloadUser = { id: 'abo1', role: Role.ABOGADO, tenantId: 't1', email: 'b@x.ec', name: 'Nombre Abogado' };
  const client: JwtPayloadUser = { id: 'cli1', role: Role.CLIENTE, tenantId: 't1', email: 'c@x.ec', name: 'Nombre Cliente' };

  const caseRow = (over = {}) => ({
    title: 'Demanda laboral',
    matterType: 'Laboral',
    processNumber: '13284-2024-00123',
    status: 'abierto',
    requestState: null,
    // 03:00 UTC del día 6 = 22:00 del día 5 en Guayaquil
    openedAt: new Date('2026-11-06T03:00:00Z'),
    updatedAt: new Date('2026-11-10T15:00:00Z'),
    closedAt: null,
    lawyer: { name: 'Nombre Abogado' },
    client: { name: 'Nombre Cliente', email: 'c@x.ec' },
    ...over,
  });

  function setup() {
    const prisma = {
      tenant: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ name: 'Firma Demo', slug: 'firma-demo', timezone: 'America/Guayaquil' }),
      },
      case: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([caseRow(), caseRow({ title: 'Consulta', requestState: 'pendiente', status: 'intake' })]),
        groupBy: jest.fn().mockResolvedValue([
          { clientId: 'c1', status: 'abierto', requestState: null, _count: { _all: 2 } },
          { clientId: 'c1', status: 'cerrado', requestState: 'aceptada', _count: { _all: 1 } },
          { clientId: 'c1', status: 'intake', requestState: 'pendiente', _count: { _all: 1 } },
        ]),
      },
      user: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', name: 'Nombre Cliente', email: 'c@x.ec', active: true, createdAt: new Date('2026-10-01T15:00:00Z'), lastLoginAt: null },
        ]),
      },
      activityEvent: { create: jest.fn() },
    };
    return { prisma, service: new ExportsService(prisma as never) };
  }

  it('el admin exporta los casos de toda la firma, con los filtros del listado', async () => {
    const { prisma, service } = setup();
    const file = await service.cases(admin, { format: 'xlsx', status: 'abierto' as never, q: 'laboral' });
    const args = prisma.case.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      tenantId: 't1',
      status: 'abierto',
      OR: [
        { title: { contains: 'laboral', mode: 'insensitive' } },
        { description: { contains: 'laboral', mode: 'insensitive' } },
      ],
    });
    expect(args.take).toBe(EXPORT_MAX_ROWS);
    expect(file.fileName).toMatch(/^casos-firma-demo-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(file.mime).toContain('spreadsheetml');

    const ws = (await readXlsx(file.buffer)).getWorksheet('Casos')!;
    expect(ws.getCell('D2').value).toBe('Abierto');
    expect(ws.getCell('D3').value).toBe('Solicitud en revisión');
    // Las fechas salen en el día de la firma, no en UTC
    expect((ws.getCell('H2').value as Date).toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });

  it('el abogado solo exporta sus casos', async () => {
    const { prisma, service } = setup();
    await service.cases(lawyer, { format: 'pdf' });
    expect(prisma.case.findMany.mock.calls[0][0].where).toEqual({ tenantId: 't1', lawyerId: 'abo1' });
    expect(prisma.case.count.mock.calls[0][0].where).toEqual({ tenantId: 't1', lawyerId: 'abo1' });
  });

  it('un cliente no exporta nada; un abogado no exporta clientes', async () => {
    const { prisma, service } = setup();
    await expect(service.cases(client, { format: 'xlsx' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.clients(lawyer, { format: 'xlsx' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.case.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('clientes: solo los de la firma, con sus casos activos y totales', async () => {
    const { prisma, service } = setup();
    const file = await service.clients(admin, { format: 'xlsx' });
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ tenantId: 't1', role: Role.CLIENTE });
    // Nunca sale la contraseña ni nada que no esté en la lista de columnas
    expect(Object.keys(prisma.user.findMany.mock.calls[0][0].select).sort()).toEqual(
      ['active', 'createdAt', 'email', 'id', 'lastLoginAt', 'name'].sort(),
    );
    const ws = (await readXlsx(file.buffer)).getWorksheet('Clientes')!;
    expect(ws.getCell('A2').value).toBe('Nombre Cliente');
    expect(ws.getCell('D2').value).toBe(2); // activos: los 2 abiertos (ni el cerrado ni la solicitud)
    expect(ws.getCell('E2').value).toBe(4); // en total
  });

  it('cada exportación queda en la actividad de la firma', async () => {
    const { prisma, service } = setup();
    await service.cases(admin, { format: 'pdf', status: 'abierto' as never });
    expect(prisma.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        actorId: 'admin1',
        caseId: null,
        type: 'CASES_EXPORTED',
        summary: 'Exportación a PDF: 2 casos (estado: Abierto)',
      }),
    });
  });
});
