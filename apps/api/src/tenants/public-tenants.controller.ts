import { Controller, Get, Header, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get(':slug/logo')
  // Más holgado: cada email abierto y cada visita al acceso lo piden (y se cachea)
  @UseGuards(IpRateLimit(300, 60_000))
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @ApiOperation({ summary: 'Logo de la firma (pantalla de acceso y emails)' })
  async logo(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, mime } = await this.tenants.publicLogo(slug);
    // La URL lleva la versión (?v=): se puede cachear sin miedo a servir un logo viejo
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return new StreamableFile(buffer, { type: mime, length: buffer.length });
  }
}
