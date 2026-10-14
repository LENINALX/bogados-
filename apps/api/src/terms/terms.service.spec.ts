import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TermsService } from './terms.service';
import { UpdateCaseDto } from '../cases/dto/case.dto';

function setup(holidays: { date: string; name: string }[] = []) {
  const prisma = {
    tenant: { findUniqueOrThrow: jest.fn().mockResolvedValue({ timezone: 'America/Guayaquil' }) },
    holiday: {
      findMany: jest.fn().mockResolvedValue(holidays.map((h) => ({ date: new Date(`${h.date}T00:00:00Z`), name: h.name }))),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { prisma, service: new TermsService(prisma as never) };
}

describe('TermsService.deadline', () => {
  it('vence a las 23:59 hora del bufete del último día hábil', async () => {
    const { service } = setup([{ date: '2026-10-09', name: 'Independencia de Guayaquil' }]);
    const r = await service.deadline('t1', '2026-10-08', 3);
    expect(r.dueOn).toBe('2026-10-14');
    // 23:59 en Guayaquil (UTC−5) = 04:59 UTC del día siguiente
    expect(r.dueAt).toBe('2026-10-15T04:59:00.000Z');
    expect(r.timeZone).toBe('America/Guayaquil');
    expect(r.skipped[0]).toEqual({ date: '2026-10-09', reason: 'Independencia de Guayaquil' });
  });

  it('busca los feriados solo del bufete y en la ventana del término', async () => {
    const { prisma, service } = setup();
    await service.deadline('t1', '2026-10-08', 3);
    const where = prisma.holiday.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe('t1');
    expect(where.date.gte.toISOString().slice(0, 10)).toBe('2026-10-09');
  });

  it('un término no válido es un 400', async () => {
    const { service } = setup();
    await expect(service.deadline('t1', '2026-10-08', 0)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('TermsService: feriados', () => {
  it('una fecha repetida es un 409 con mensaje claro', async () => {
    const { prisma, service } = setup();
    prisma.holiday.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(service.createHoliday('t1', '2026-11-04', 'Fundación de Manta')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('carga los 11 nacionales sin pisar los que ya existen', async () => {
    const { prisma, service } = setup();
    prisma.holiday.createMany.mockResolvedValue({ count: 9 });
    await expect(service.loadNationalHolidays('t1', 2026)).resolves.toEqual({ created: 9, skipped: 2 });
    const arg = prisma.holiday.createMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data).toHaveLength(11);
    expect(arg.data.every((d: { tenantId: string }) => d.tenantId === 't1')).toBe(true);
  });

  it('no borra feriados de otro bufete', async () => {
    const { prisma, service } = setup();
    prisma.holiday.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.removeHoliday('t1', 'h-de-otro')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.holiday.deleteMany).toHaveBeenCalledWith({ where: { id: 'h-de-otro', tenantId: 't1' } });
  });
});

describe('Número de proceso (UpdateCaseDto)', () => {
  const check = async (processNumber: unknown) => {
    const dto = plainToInstance(UpdateCaseDto, { processNumber });
    return { dto, errors: await validate(dto) };
  };

  it('normaliza espacios y mayúsculas', async () => {
    const { dto, errors } = await check(' 13284-2024-00123g ');
    expect(errors).toHaveLength(0);
    expect(dto.processNumber).toBe('13284-2024-00123G');
  });

  it('vacío desvincula (null)', async () => {
    const { dto, errors } = await check('');
    expect(errors).toHaveLength(0);
    expect(dto.processNumber).toBeNull();
  });

  it('rechaza formatos que no son del SATJE', async () => {
    for (const bad of ['123', '13284-24-00123', '13284-2024-123', 'ABCDE-2024-00123']) {
      const { errors } = await check(bad);
      expect(errors).not.toHaveLength(0);
    }
  });
});
