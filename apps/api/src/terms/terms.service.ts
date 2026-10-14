import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { zonedToUtc } from '../appointments/time';
import {
  TermBreakdown,
  computeTermDeadline,
  ecuadorNationalHolidays,
  termSearchWindow,
} from './business-days';

/** El término vence al terminar el día, en hora local del bufete. */
const END_OF_DAY_MINUTES = 23 * 60 + 59;

const ymdOf = (d: Date) => d.toISOString().slice(0, 10);
const dateOf = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

export type TermDeadline = TermBreakdown & { dueAt: string; timeZone: string };

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  /** Vencimiento de un término con el desglose de días contados y saltados. */
  async deadline(tenantId: string, notifiedOn: string, days: number): Promise<TermDeadline> {
    const { from, to } = termSearchWindow(notifiedOn, days);
    const [tenant, holidays] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } }),
      this.prisma.holiday.findMany({
        where: { tenantId, date: { gte: dateOf(from), lte: dateOf(to) } },
        select: { date: true, name: true },
      }),
    ]);
    let breakdown: TermBreakdown;
    try {
      breakdown = computeTermDeadline(notifiedOn, days, new Map(holidays.map((h) => [ymdOf(h.date), h.name])));
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return {
      ...breakdown,
      dueAt: zonedToUtc(breakdown.dueOn, END_OF_DAY_MINUTES, tenant.timezone).toISOString(),
      timeZone: tenant.timezone,
    };
  }

  async listHolidays(tenantId: string, year: number) {
    const items = await this.prisma.holiday.findMany({
      where: { tenantId, date: { gte: dateOf(`${year}-01-01`), lte: dateOf(`${year}-12-31`) } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, name: true },
    });
    return items.map((h) => ({ ...h, date: ymdOf(h.date) }));
  }

  async createHoliday(tenantId: string, date: string, name: string) {
    try {
      const h = await this.prisma.holiday.create({
        data: { tenantId, date: dateOf(date), name: name.trim() },
        select: { id: true, date: true, name: true },
      });
      return { ...h, date: ymdOf(h.date) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya hay un feriado registrado en esa fecha');
      }
      throw e;
    }
  }

  async removeHoliday(tenantId: string, id: string) {
    const { count } = await this.prisma.holiday.deleteMany({ where: { id, tenantId } });
    if (!count) throw new NotFoundException('Feriado no encontrado');
    return { ok: true };
  }

  /**
   * Carga los feriados nacionales del año en su fecha original. No toca los que ya existan
   * en esas fechas (p. ej. un traslado ya corregido por el administrador).
   */
  async loadNationalHolidays(tenantId: string, year: number) {
    const list = ecuadorNationalHolidays(year);
    const { count } = await this.prisma.holiday.createMany({
      data: list.map((h) => ({ tenantId, date: dateOf(h.date), name: h.name })),
      skipDuplicates: true,
    });
    return { created: count, skipped: list.length - count };
  }
}
