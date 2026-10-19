import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

/** Sin sesión: lo usa la pantalla de acceso antes de entrar. */
@ApiTags('tenants')
@Controller({ path: 'tenants/public', version: '1' })
export class PublicTenantsController {
  constructor(private tenants: TenantsService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Nombre de la firma a partir de su código (pantalla de acceso)' })
  findPublic(@Param('slug') slug: string) {
    return this.tenants.findPublic(slug);
  }
}
