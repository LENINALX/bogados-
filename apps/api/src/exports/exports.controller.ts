import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ExportsService, ExportedFile } from './exports.service';
import { ExportCasesQueryDto, ExportClientsQueryDto } from './dto/export.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { attachmentDisposition } from '../common/utils/content-disposition';

function download(file: ExportedFile) {
  return new StreamableFile(file.buffer, {
    type: file.mime,
    disposition: attachmentDisposition(file.fileName),
    length: file.buffer.length,
  });
}

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'exports', version: '1' })
export class ExportsController {
  constructor(private exports: ExportsService) {}

  @Get('cases')
  @Roles(Role.ADMIN, Role.ABOGADO)
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Casos en Excel o PDF: el admin, los de la firma; el abogado, los suyos' })
  async cases(@Query() query: ExportCasesQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return download(await this.exports.cases(user, query));
  }

  @Get('clients')
  @Roles(Role.ADMIN)
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Clientes de la firma en Excel o PDF (solo admin)' })
  async clients(@Query() query: ExportClientsQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return download(await this.exports.clients(user, query));
  }
}
