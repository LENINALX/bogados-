import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IpRateLimit } from '../common/guards/ip-rate-limit.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

/** Sin sesión: lo usa la pantalla de acceso antes de entrar. */
@ApiTags('tenants')
@Controller({ path: 'tenants/public', version: '1' })
export class PublicTenantsController {
  constructor(private tenants: TenantsService) {}

  @Get(':slug')
  // Sin sesión: se limita por IP para que no se puedan recorrer códigos de firma en masa
  @UseGuards(IpRateLimit(60, 60_000))
  @ApiOperation({ summary: 'Nombre de la firma a partir de su código (pantalla de acceso)' })
  findPublic(@Param('slug') slug: string) {
    return this.tenants.findPublic(slug);
  }
}
