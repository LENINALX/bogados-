import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { logoUploadOptions } from './branding';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private tenants: TenantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Tenant del usuario autenticado' })
  me(@CurrentUser() user: JwtPayloadUser) {
    return this.tenants.findOne(user.tenantId, user);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar tenants (solo el propio)' })
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.tenants.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.tenants.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.tenants.update(id, dto, user);
  }

  @Post(':id/logo')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', logoUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Sube o sustituye el logo de la firma (PNG, JPG o WebP, máx. 512 KB)' })
  setLogo(
    @Param('id', ParseIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.tenants.setLogo(id, file, user);
  }

  @Delete(':id/logo')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Quita el logo de la firma' })
  removeLogo(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.tenants.removeLogo(id, user);
  }
}
