import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role, Tenant, User, UserTokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { ForgotPasswordDto } from './dto/password.dto';
import {
  ChangePasswordDto,
  ResendLoginCodeDto,
  UpdateTwoFactorDto,
  VerifyLoginDto,
} from './dto/login-security.dto';
import { AccountTokensService, unusablePasswordHash } from './account-tokens.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ClientMeta } from './client-meta';
import { LoginEventsService, LoginReason } from './login-events.service';
import { requiresTwoFactor, TwoFactorService } from './two-factor.service';

/**
 * Bloqueo de la cuenta por contraseñas fallidas: se cuentan solo los fallos (no los accesos
 * correctos) desde el último acceso correcto. Al pasar la ventana desde el fallo más antiguo,
 * se libera.
 */
export const ACCOUNT_LOCKOUT = { maxFailures: 5, windowMs: 15 * 60_000 } as const;

/** Duración del token según «Mantener la sesión iniciada». */
export const SESSION_TTL = { default: '12h', remember: '30d' } as const;

/**
 * Hash de una contraseña que nadie conoce: con un email inexistente también se
 * ejecuta bcrypt, para que el tiempo de respuesta no revele qué cuentas existen.
 */
let dummyHash: Promise<string> | null = null;
function timingDummyHash() {
  dummyHash ??= bcrypt.hash('bogados-timing-equalizer', 10);
  return dummyHash;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private tokens: AccountTokensService,
    private loginEvents: LoginEventsService,
    private twoFactor: TwoFactorService,
  ) {}

  /**
   * Siempre responde igual, exista o no la cuenta: así no se puede averiguar
   * qué emails están registrados en cada firma.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    const user = tenant
      ? await this.prisma.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase().trim() } },
        })
      : null;
    if (user?.active) await this.tokens.send(user.id, UserTokenType.RESET);
    return { ok: true };
  }

  async login(dto: LoginDto, meta: ClientMeta = {}) {
    const email = dto.email.toLowerCase().trim();

    // El email solo es único por tenant, así que siempre se resuelve la firma primero
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (!tenant) {
      await bcrypt.compare(dto.password, await timingDummyHash());
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email },
      },
    });

    // Bloqueada también con la contraseña correcta: si no, el bloqueo no frenaría nada
    const failures = await this.loginEvents.recentPasswordFailures(tenant.id, email, ACCOUNT_LOCKOUT.windowMs);
    if (failures.count >= ACCOUNT_LOCKOUT.maxFailures) {
      const releaseAt = (failures.oldest?.getTime() ?? Date.now()) + ACCOUNT_LOCKOUT.windowMs;
      throw new HttpException(
        {
          message: 'Demasiados intentos fallidos. Por seguridad, la cuenta queda bloqueada unos minutos.',
          error: { code: 'ACCOUNT_LOCKED', retryAfterSeconds: Math.max(1, Math.ceil((releaseAt - Date.now()) / 1000)) },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Un único mensaje para todos los fallos; el motivo real queda en el registro de la firma
    const fail = async (reason: LoginReason): Promise<never> => {
      await this.loginEvents.record({
        tenantId: tenant.id,
        userId: user?.id ?? null,
        email,
        success: false,
        reason,
        ...meta,
      });
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        error: {
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: Math.max(0, ACCOUNT_LOCKOUT.maxFailures - failures.count - 1),
        },
      });
    };

    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? (await timingDummyHash()));
    if (!user) return fail('unknown_user');
    if (!ok) return fail('bad_password');
    if (!user.active) return fail('inactive');

    const remember = dto.remember ?? false;
    if (requiresTwoFactor(user, tenant)) {
      return this.twoFactor.start(user, tenant, { remember, ...meta });
    }
    return this.completeLogin(user, tenant, { remember, method: 'password', ...meta });
  }

  /** Segundo paso: el código del email. El desafío guarda el origen y «mantener la sesión». */
  async verifyLogin(dto: VerifyLoginDto) {
    const challenge = await this.twoFactor.verify(dto.challengeId, dto.code);
    const { tenant, ...user } = challenge.user;
    return this.completeLogin(user, tenant, {
      remember: challenge.remember,
      method: 'two_factor',
      ip: challenge.ip,
      userAgent: challenge.userAgent,
    });
  }

  resendLoginCode(dto: ResendLoginCodeDto) {
    return this.twoFactor.resend(dto.challengeId);
  }

  private async completeLogin(
    user: User,
    tenant: Tenant,
    opts: ClientMeta & { remember: boolean; method: 'password' | 'two_factor' },
  ) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
      await this.loginEvents.record(
        {
          tenantId: tenant.id,
          userId: user.id,
          email: user.email,
          success: true,
          reason: opts.method,
          ip: opts.ip,
          userAgent: opts.userAgent,
        },
        tx,
      );
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: opts.remember ? SESSION_TTL.remember : SESSION_TTL.default,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      /** El acceso anterior a este: la web lo muestra para detectar accesos ajenos */
      previousLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  /** Estado de seguridad de la propia cuenta: dos pasos y últimos accesos. */
  async security(actor: JwtPayloadUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { twoFactorEnabled: true, role: true, lastLoginAt: true, tenant: { select: { requireTwoFactor: true } } },
    });
    return {
      twoFactorEnabled: user.twoFactorEnabled,
      /** La firma lo exige a su equipo: no se puede desactivar */
      twoFactorRequiredByFirm: user.tenant.requireTwoFactor && user.role !== Role.CLIENTE,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      recent: await this.loginEvents.recentForUser(actor.id),
    };
  }

  async updateTwoFactor(dto: UpdateTwoFactorDto, actor: JwtPayloadUser) {
    const user = await this.verifyOwnPassword(actor.id, dto.password);
    if (!dto.enabled && user.tenant.requireTwoFactor && user.role !== Role.CLIENTE) {
      throw new BadRequestException('Tu firma exige la verificación en dos pasos al equipo: no se puede desactivar.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: dto.enabled } });
    return { twoFactorEnabled: dto.enabled };
  }

  /** Cierra todas las sesiones abiertas (también esta): los JWT anteriores dejan de valer. */
  async changePassword(dto: ChangePasswordDto, actor: JwtPayloadUser) {
    const user = await this.verifyOwnPassword(actor.id, dto.currentPassword);
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10), passwordChangedAt: new Date() },
    });
    return { ok: true };
  }

  /** 400 y no 401: un 401 haría que la web cerrara la sesión por un simple error al teclear. */
  private async verifyOwnPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { tenant: true } });
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    return user;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        active: true,
        createdAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario no disponible');
    }
    return user;
  }

  /** Admin/Abogado crea un usuario CLIENTE en el tenant (opcionalmente lo vincula a un caso). */
  async registerClient(dto: RegisterClientDto, actor: JwtPayloadUser) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: actor.tenantId, email },
      },
    });
    if (exists) throw new ConflictException('Email ya registrado en el tenant');

    if (dto.caseId) {
      const c = await this.prisma.case.findFirst({
        where: { id: dto.caseId, tenantId: actor.tenantId },
      });
      if (!c) throw new BadRequestException('Caso no encontrado');
      if (actor.role === Role.ABOGADO && c.lawyerId !== actor.id) {
        throw new BadRequestException('Sin acceso a ese caso');
      }
    }

    // Sin contraseña: se invita por email y el cliente la define al activar la cuenta
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : await unusablePasswordHash();
    const client = await this.prisma.user.create({
      data: {
        tenantId: actor.tenantId,
        email,
        name: dto.name,
        role: Role.CLIENTE,
        passwordHash,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        active: true,
        createdAt: true,
      },
    });

    if (dto.caseId) {
      await this.prisma.case.update({
        where: { id: dto.caseId },
        data: { clientId: client.id },
      });
    }

    const invitationSent = dto.password
      ? false
      : await this.tokens.send(client.id, UserTokenType.INVITE, actor.name);
    return { ...client, invitationSent };
  }
}
