import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, Case } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';

export async function getAccessibleCase(
  prisma: PrismaService,
  caseId: string,
  user: JwtPayloadUser,
): Promise<Case> {
  const where: {
    id: string;
    tenantId: string;
    lawyerId?: string;
    clientId?: string;
  } = { id: caseId, tenantId: user.tenantId };

  if (user.role === Role.ABOGADO) where.lawyerId = user.id;
  if (user.role === Role.CLIENTE) where.clientId = user.id;

  const c = await prisma.case.findFirst({ where });
  if (!c) throw new NotFoundException('Caso no encontrado');
  return c;
}

export function assertSameTenant(resourceTenantId: string, userTenantId: string) {
  if (resourceTenantId !== userTenantId) {
    throw new ForbiddenException('Recurso de otro tenant');
  }
}
