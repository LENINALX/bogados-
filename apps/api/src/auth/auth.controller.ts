import { Body, Controller, Get, HttpCode, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { AccountTokensService } from './account-tokens.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { LoginThrottlerGuard } from './login-throttle';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Client, ClientMeta } from './client-meta';
import { LoginEventsService } from './login-events.service';
import {
  ChangePasswordDto,
  ListLoginEventsQueryDto,
  ResendLoginCodeDto,
  UpdateTwoFactorDto,
  VerifyLoginDto,
} from './dto/login-security.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private auth: AuthService,
    private tokens: AccountTokensService,
    private loginEvents: LoginEventsService,
  ) {}

  @Post('login')
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({
    summary: 'Login con email/contraseña → JWT, o desafío de código por email si la cuenta usa dos pasos',
    description: 'Máx. 10 intentos / 15 min por cuenta',
  })
  login(@Body() dto: LoginDto, @Client() meta: ClientMeta) {
    return this.auth.login(dto, meta);
  }

  @Post('login/verify')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'Segundo paso: código de 6 dígitos enviado por email → JWT' })
  verifyLogin(@Body() dto: VerifyLoginDto) {
    return this.auth.verifyLogin(dto);
  }

  @Post('login/resend')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'Reenvía el código de acceso (cada 30 s, máx. 4 envíos)' })
  resendLoginCode(@Body() dto: ResendLoginCodeDto) {
    return this.auth.resendLoginCode(dto);
  }

  @Get('security')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seguridad de la propia cuenta: dos pasos y últimos accesos' })
  security(@CurrentUser() user: JwtPayloadUser) {
    return this.auth.security(user);
  }

  @Patch('two-factor')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activa o desactiva la verificación en dos pasos (pide la contraseña)' })
  updateTwoFactor(@Body() dto: UpdateTwoFactorDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auth.updateTwoFactor(dto, user);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambia la contraseña y cierra todas las sesiones abiertas' })
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auth.changePassword(dto, user);
  }

  @Get('login-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registro de accesos de la firma (solo admin)' })
  listLoginEvents(@Query() query: ListLoginEventsQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loginEvents.listForTenant(user.tenantId, query);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({
    summary: 'Pide un enlace para restablecer la contraseña (responde igual exista o no la cuenta)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Get('token-info')
  @ApiOperation({ summary: 'Datos de un enlace de invitación/recuperación vigente' })
  tokenInfo(@Query('token') token: string) {
    return this.tokens.info(token ?? '');
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Define la contraseña con un enlace de invitación o recuperación' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.tokens.setPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usuario autenticado actual' })
  me(@CurrentUser() user: JwtPayloadUser) {
    return this.auth.me(user.id);
  }

  @Post('register-client')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ABOGADO)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin/Abogado crea usuario CLIENTE (opcionalmente lo vincula a un caso)',
  })
  registerClient(
    @Body() dto: RegisterClientDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.auth.registerClient(dto, user);
  }
}
