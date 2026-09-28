import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/tenant.dto';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

/**
 * Todas las operaciones quedan acotadas al tenant del usuario autenticado.
 * No existe (aún) un rol de administrador de plataforma, así que el alta de
 * nuevas firmas no se expone por API.
 */
@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  findAll(actor: JwtPayloadUser) {
    return this.prisma.tenant.findMany({ where: { id: actor.tenantId } });
  }

  async findOne(id: string, actor: JwtPayloadUser) {
    // Otro tenant se trata como inexistente para no revelar ids válidos
    if (id !== actor.tenantId) throw new NotFoundException('Tenant no encontrado');
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant no encontrado');
    return t;
  }

  async update(id: string, dto: UpdateTenantDto, actor: JwtPayloadUser) {
    await this.findOne(id, actor);
    if (dto.slug) {
      const exists = await this.prisma.tenant.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (exists) throw new ConflictException('Slug ya en uso');
    }
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }
}
