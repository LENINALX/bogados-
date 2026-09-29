import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
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

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private auth: AuthService,
    private tokens: AccountTokensService,
  ) {}

  @Post('login')
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'Login con email/contraseña → JWT (máx. 10 intentos / 15 min por cuenta)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
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
