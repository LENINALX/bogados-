import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { isStaff } from '../common/utils/permissions';

/** Resultados por grupo: pocos y relevantes (es una búsqueda rápida, no un listado). */
export const SEARCH_GROUP_LIMIT = 5;
/** Por debajo de esto no se busca: una letra coincide con casi todo. */
export const SEARCH_MIN_LENGTH = 2;

type Group<T> = { items: T[]; hasMore: boolean };

/** Corta al límite e indica si había más (se pide uno de más para saberlo sin contar). */
function group<T>(rows: T[]): Group<T> {
  return { items: rows.slice(0, SEARCH_GROUP_LIMIT), hasMore: rows.length > SEARCH_GROUP_LIMIT };
}

/**
 * Búsqueda global de casos, clientes y documentos con las mismas reglas de acceso que el resto de la API:
 * - ADMIN: toda la firma
 * - ABOGADO: solo sus casos, los documentos de esos casos y los clientes de esos casos
 * - CLIENTE: solo sus casos y los documentos compartidos con él; nunca otros clientes
 */
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(user: JwtPayloadUser, rawQuery: string | undefined) {
    const q = (rawQuery ?? '').trim();
    const empty = { query: q, cases: group([]), clients: group([]), documents: group([]) };
    if (q.length < SEARCH_MIN_LENGTH) return empty;

    const like = { contains: q, mode: Prisma.QueryMode.insensitive };
    const staff = isStaff(user.role);

    // Ámbito de casos visibles para este usuario (igual que getAccessibleCase / CasesService.findAll)
    const caseScope: Prisma.CaseWhereInput = { tenantId: user.tenantId };
    if (user.role === Role.ABOGADO) caseScope.lawyerId = user.id;
    if (user.role === Role.CLIENTE) caseScope.clientId = user.id;

    const caseMatch: Prisma.CaseWhereInput[] = [
      { title: like },
      { description: like },
      { matterType: like },
      { processNumber: like },
    ];
    // El despacho también encuentra un caso por el nombre o email de su cliente
    if (staff) caseMatch.push({ client: { name: like } }, { client: { email: like } });

    const casesQuery = this.prisma.case.findMany({
      where: { ...caseScope, OR: caseMatch },
      select: {
        id: true,
        title: true,
        status: true,
        requestState: true,
        matterType: true,
        processNumber: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        lawyer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: SEARCH_GROUP_LIMIT + 1,
    });

    const documentsQuery = this.prisma.document.findMany({
      where: {
        tenantId: user.tenantId,
        fileName: like,
        case: caseScope,
        ...(staff ? {} : { sharedWithClient: true }),
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sharedWithClient: true,
        createdAt: true,
        case: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: SEARCH_GROUP_LIMIT + 1,
    });

    // Abogado: solo clientes con algún caso suyo; y de ellos solo cuenta/enlaza sus casos
    const lawyerCases: Prisma.CaseWhereInput | undefined =
      user.role === Role.ABOGADO ? { lawyerId: user.id } : undefined;

    const clientsQuery = staff
      ? this.prisma.user.findMany({
          where: {
            tenantId: user.tenantId,
            role: Role.CLIENTE,
            OR: [{ name: like }, { email: like }],
            ...(lawyerCases ? { casesAsClient: { some: lawyerCases } } : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            casesAsClient: {
              where: lawyerCases ?? {},
              select: { id: true, title: true },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
            _count: { select: { casesAsClient: lawyerCases ? { where: lawyerCases } : true } },
          },
          orderBy: [{ active: 'desc' }, { name: 'asc' }],
          take: SEARCH_GROUP_LIMIT + 1,
        })
      : Promise.resolve([]);

    const [cases, documents, clients] = await Promise.all([casesQuery, documentsQuery, clientsQuery]);

    return {
      query: q,
      cases: group(cases),
      documents: group(documents),
      clients: group(
        clients.map(({ casesAsClient, _count, ...c }) => ({
          ...c,
          caseCount: _count.casesAsClient,
          latestCase: casesAsClient[0] ?? null,
        })),
      ),
    };
  }
}
