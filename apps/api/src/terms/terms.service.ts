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
import { recordActivity } from '../activity/activity.service';

/** El término vence al terminar el día, en hora local del bufete. */
const END_OF_DAY_MINUTES = 23 * 60 + 59;

const ymdOf = (d: Date) => d.toISOString().slice(0, 10);
const dateOf = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

export type TermDeadline = TermBreakdown & {
  dueAt: string;
  timeZone: string;
  /** Años del cálculo sin feriados cargados en la firma: se usaron los nacionales de Ecuador */
  assumedNationalYears: number[];
};

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  /** Vencimiento de un término con el desglose de días contados y saltados. */
  async deadline(tenantId: string, notifiedOn: string, days: number): Promise<TermDeadline> {
    const { from, to } = termSearchWindow(notifiedOn, days);
    const firstYear = Number(from.slice(0, 4));
    const lastYear = Number(to.slice(0, 4));
    // Años enteros: así se sabe si la firma cargó los feriados de cada año que toca el término
    const [tenant, holidays] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } }),
      this.prisma.holiday.findMany({
        where: { tenantId, date: { gte: dateOf(`${firstYear}-01-01`), lte: dateOf(`${lastYear}-12-31`) } },
        select: { date: true, name: true },
      }),
    ]);
    const map = new Map(holidays.map((h) => [ymdOf(h.date), h.name]));
    const loadedYears = new Set(holidays.map((h) => h.date.getUTCFullYear()));
    const assumedNationalYears: number[] = [];
    for (let y = firstYear; y <= lastYear; y++) {
      if (loadedYears.has(y)) continue;
      // Sin feriados del año, contar Año Nuevo o Navidad como hábiles adelantaría el vencimiento
      assumedNationalYears.push(y);
      for (const h of ecuadorNationalHolidays(y)) map.set(h.date, h.name);
    }
    let breakdown: TermBreakdown;
    try {
      breakdown = computeTermDeadline(notifiedOn, days, map);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return {
      ...breakdown,
      dueAt: zonedToUtc(breakdown.dueOn, END_OF_DAY_MINUTES, tenant.timezone).toISOString(),
      timeZone: tenant.timezone,
      assumedNationalYears,
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

  /** `actorId`: quién lo hace, para el registro de actividad (los cambios de feriados mueven plazos). */
  async createHoliday(tenantId: string, date: string, name: string, actorId?: string | null) {
    try {
      const h = await this.prisma.$transaction(async (tx) => {
        const created = await tx.holiday.create({
          data: { tenantId, date: dateOf(date), name: name.trim() },
          select: { id: true, date: true, name: true },
        });
        if (actorId) {
          await recordActivity(tx, {
            tenantId,
            actorId,
            type: 'HOLIDAY_ADDED',
            summary: `Feriado añadido: ${created.name} (${date})`,
            meta: { holidayId: created.id, date },
          });
        }
        return created;
      });
      return { ...h, date: ymdOf(h.date) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya hay un feriado registrado en esa fecha');
      }
      throw e;
    }
  }

  async removeHoliday(tenantId: string, id: string, actorId?: string | null) {
    await this.prisma.$transaction(async (tx) => {
      const holiday = await tx.holiday.findFirst({ where: { id, tenantId }, select: { name: true, date: true } });
      const { count } = await tx.holiday.deleteMany({ where: { id, tenantId } });
      if (!count || !holiday) throw new NotFoundException('Feriado no encontrado');
      if (actorId) {
        await recordActivity(tx, {
          tenantId,
          actorId,
          type: 'HOLIDAY_REMOVED',
          summary: `Feriado eliminado: ${holiday.name} (${ymdOf(holiday.date)})`,
          meta: { date: ymdOf(holiday.date) },
        });
      }
    });
    return { ok: true };
  }

  /**
   * Carga los feriados nacionales del año en su fecha original. No toca los que ya existan
   * en esas fechas (p. ej. un traslado ya corregido por el administrador).
   */
  async loadNationalHolidays(tenantId: string, year: number, actorId?: string | null) {
    const list = ecuadorNationalHolidays(year);
    const { count } = await this.prisma.holiday.createMany({
      data: list.map((h) => ({ tenantId, date: dateOf(h.date), name: h.name })),
      skipDuplicates: true,
    });
    if (actorId && count > 0) {
      await recordActivity(this.prisma, {
        tenantId,
        actorId,
        type: 'HOLIDAYS_LOADED',
        summary: `Feriados nacionales de ${year} cargados (${count} nuevos)`,
        meta: { year, created: count },
      });
    }
    return { created: count, skipped: list.length - count };
  }
}
