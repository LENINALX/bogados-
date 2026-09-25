import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private assertClient(user: JwtPayloadUser) {
    if (user.role !== Role.CLIENTE) {
      throw new ForbiddenException('Solo para portal cliente');
    }
  }

  async myCases(user: JwtPayloadUser) {
    this.assertClient(user);
    return this.prisma.case.findMany({
      where: { tenantId: user.tenantId, clientId: user.id },
      include: {
        lawyer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async myCase(caseId: string, user: JwtPayloadUser) {
    this.assertClient(user);
    const c = await getAccessibleCase(this.prisma, caseId, user);
    return this.prisma.case.findFirst({
      where: { id: c.id },
      include: {
        lawyer: { select: { id: true, name: true, email: true } },
        notes: {
          where: { isInternal: false },
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          where: { sharedWithClient: true },
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
