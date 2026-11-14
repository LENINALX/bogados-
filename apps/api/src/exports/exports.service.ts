import { ForbiddenException, Injectable } from '@nestjs/common';
import { CaseRequestState, CaseStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { recordActivity } from '../activity/activity.service';
import { localYmd } from '../appointments/time';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ExportCasesQueryDto, ExportClientsQueryDto } from './dto/export.dto';
import { buildExport, EXPORT_LABEL, EXPORT_MIME, ExportFormat, ExportTable } from './export-files';

/** Tope de filas por archivo: una exportación no debe poder tumbar la API. */
export const EXPORT_MAX_ROWS = 5000;

export type ExportedFile = { buffer: Buffer; fileName: string; mime: string };

const STATUS_LABEL: Record<CaseStatus, string> = {
  intake: 'Ingreso',
  abierto: 'Abierto',
  en_pausa: 'En pausa',
  cerrado: 'Cerrado',
};

/** Solicitudes del portal que aún no son un caso aceptado: se distinguen en la columna de estado. */
const REQUEST_LABEL: Partial<Record<CaseRequestState, string>> = {
  pendiente: 'Solicitud en revisión',
  aplazada: 'Solicitud aplazada',
  rechazada: 'Solicitud no aceptada',
};

const count = (n: number, one: string, many: string) => `${n.toLocaleString('es-EC')} ${n === 1 ? one : many}`;

/** Casos y clientes en Excel o PDF. Cada rol exporta solo lo que ya puede ver en la app. */
@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  async cases(user: JwtPayloadUser, query: ExportCasesQueryDto): Promise<ExportedFile> {
    // El controlador ya lo restringe; aquí se repite porque de este filtro depende qué datos salen
    if (user.role !== Role.ADMIN && user.role !== Role.ABOGADO) {
      throw new ForbiddenException('Sin permiso para exportar casos');
    }
    const where: Prisma.CaseWhereInput = { tenantId: user.tenantId };
    if (user.role === Role.ABOGADO) where.lawyerId = user.id;
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [tenant, total, cases] = await Promise.all([
      this.tenant(user.tenantId),
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: EXPORT_MAX_ROWS,
        select: {
          title: true,
          matterType: true,
          processNumber: true,
          status: true,
          requestState: true,
          openedAt: true,
          updatedAt: true,
          closedAt: true,
          lawyer: { select: { name: true } },
          client: { select: { name: true, email: true } },
        },
      }),
    ]);
    const day = (d: Date | null) => (d ? localYmd(d, tenant.timezone) : null);

    const filters = [
      user.role === Role.ABOGADO ? `Casos asignados a ${user.name}` : 'Casos de toda la firma',
      query.status && `estado: ${STATUS_LABEL[query.status]}`,
      query.q && `búsqueda: «${query.q}»`,
    ].filter(Boolean) as string[];

    const table: ExportTable = {
      title: 'Casos',
      firmName: tenant.name,
      details: this.details(filters.join(' · '), count(cases.length, 'caso', 'casos'), total, user, tenant.timezone),
      columns: [
        { header: 'Título', width: 36 },
        { header: 'Materia', width: 18 },
        { header: 'N.º de proceso', width: 20 },
        { header: 'Estado', width: 18 },
        { header: 'Abogado', width: 22 },
        { header: 'Cliente', width: 22 },
        { header: 'Email del cliente', width: 27 },
        // 16: una fecha (y «Actualizado») cabe en una línea del PDF
        { header: 'Abierto', width: 16, kind: 'date' },
        { header: 'Actualizado', width: 16, kind: 'date' },
        { header: 'Cerrado', width: 16, kind: 'date' },
      ],
      rows: cases.map((c) => [
        c.title,
        c.matterType,
        c.processNumber,
        (c.requestState && REQUEST_LABEL[c.requestState]) ?? STATUS_LABEL[c.status],
        c.lawyer?.name ?? null,
        c.client?.name ?? null,
        c.client?.email ?? null,
        day(c.openedAt),
        day(c.updatedAt),
        day(c.closedAt),
      ]),
    };
    return this.finish('casos', 'CASES_EXPORTED', table, query.format, user, tenant, count(cases.length, 'caso', 'casos'), filters.slice(1));
  }

  async clients(user: JwtPayloadUser, query: ExportClientsQueryDto): Promise<ExportedFile> {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Sin permiso para exportar clientes');
    const where: Prisma.UserWhereInput = { tenantId: user.tenantId, role: Role.CLIENTE };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [tenant, total, clients] = await Promise.all([
      this.tenant(user.tenantId),
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: EXPORT_MAX_ROWS,
        select: { id: true, name: true, email: true, active: true, createdAt: true, lastLoginAt: true },
      }),
    ]);
    // Casos por cliente en una sola consulta; «activo» = aceptado (o creado por el despacho) y sin cerrar
    const groups = await this.prisma.case.groupBy({
      by: ['clientId', 'status', 'requestState'],
      where: { tenantId: user.tenantId, clientId: { in: clients.map((c) => c.id) } },
      _count: { _all: true },
    });
    const totals = new Map<string, { all: number; active: number }>();
    for (const g of groups) {
      if (!g.clientId) continue;
      const t = totals.get(g.clientId) ?? { all: 0, active: 0 };
      t.all += g._count._all;
      const accepted = g.requestState === null || g.requestState === CaseRequestState.aceptada;
      if (accepted && g.status !== CaseStatus.cerrado) t.active += g._count._all;
      totals.set(g.clientId, t);
    }
    const day = (d: Date | null) => (d ? localYmd(d, tenant.timezone) : null);

    const filters = ['Clientes de la firma', query.q && `búsqueda: «${query.q}»`].filter(Boolean) as string[];
    const table: ExportTable = {
      title: 'Clientes',
      firmName: tenant.name,
      details: this.details(filters.join(' · '), count(clients.length, 'cliente', 'clientes'), total, user, tenant.timezone),
      columns: [
        { header: 'Nombre', width: 30 },
        { header: 'Email', width: 34 },
        { header: 'Cuenta', width: 14 },
        { header: 'Casos activos', width: 14, kind: 'number' },
        { header: 'Casos en total', width: 14, kind: 'number' },
        { header: 'Último acceso', width: 14, kind: 'date' },
        { header: 'Alta', width: 12, kind: 'date' },
      ],
      rows: clients.map((c) => [
        c.name,
        c.email,
        c.active ? 'Activa' : 'Desactivada',
        totals.get(c.id)?.active ?? 0,
        totals.get(c.id)?.all ?? 0,
        day(c.lastLoginAt),
        day(c.createdAt),
      ]),
    };
    return this.finish('clientes', 'CLIENTS_EXPORTED', table, query.format, user, tenant, count(clients.length, 'cliente', 'clientes'), filters.slice(1));
  }

  private tenant(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id }, select: { name: true, slug: true, timezone: true } });
  }

  private details(scope: string, shown: string, total: number, user: JwtPayloadUser, timeZone: string): string[] {
    const when = new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'long', timeStyle: 'short' }).format(new Date());
    const lines = [scope, `${shown} · Generado el ${when} por ${user.name}`];
    if (total > EXPORT_MAX_ROWS) {
      lines.push(
        `Hay ${total.toLocaleString('es-EC')} registros: se incluyen los primeros ${EXPORT_MAX_ROWS.toLocaleString('es-EC')}. Usa los filtros para acotar.`,
      );
    }
    return lines;
  }

  /** Genera el archivo y deja constancia en la actividad de la firma: una exportación saca datos de la app. */
  private async finish(
    name: string,
    type: 'CASES_EXPORTED' | 'CLIENTS_EXPORTED',
    table: ExportTable,
    format: ExportFormat,
    user: JwtPayloadUser,
    tenant: { slug: string; timezone: string },
    what: string,
    /** Filtros aplicados, sin el alcance (quién exporta ya consta como autor) */
    filters: string[],
  ): Promise<ExportedFile> {
    const buffer = await buildExport(format, table);
    await recordActivity(this.prisma, {
      tenantId: user.tenantId,
      actorId: user.id,
      type,
      summary: `Exportación a ${EXPORT_LABEL[format]}: ${what}${filters.length ? ` (${filters.join(' · ')})` : ''}`,
      meta: { format, rows: table.rows.length },
    });
    return {
      buffer,
      fileName: `${name}-${tenant.slug}-${localYmd(new Date(), tenant.timezone)}.${format}`,
      mime: EXPORT_MIME[format],
    };
  }
}
