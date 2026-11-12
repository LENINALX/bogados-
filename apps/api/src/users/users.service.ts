import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role, UserTokenType } from '@prisma/client';
import { AccountTokensService, unusablePasswordHash } from '../auth/account-tokens.service';
import { PrismaService } from '../prisma/prisma.service';
import { recordActivity } from '../activity/activity.service';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/user.dto';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import {
  paginateParams,
  toPaginated,
} from '../common/dto/pagination.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', ABOGADO: 'Abogado', CLIENTE: 'Cliente' };

/** Qué cambió, en palabras, para el registro de actividad. Nunca incluye la contraseña. */
function describeChanges(
  before: { name: string; email: string; role: Role; active: boolean },
  data: { name?: string; email?: string; role?: Role; active?: boolean; passwordHash?: string },
) {
  const changes: string[] = [];
  if (data.name !== undefined && data.name !== before.name) changes.push(`nombre: ${before.name} → ${data.name}`);
  if (data.email !== undefined && data.email !== before.email) changes.push('email cambiado');
  if (data.role !== undefined && data.role !== before.role) {
    changes.push(`rol: ${ROLE_LABEL[before.role]} → ${ROLE_LABEL[data.role]}`);
  }
  if (data.passwordHash !== undefined) changes.push('contraseña restablecida');
  return changes;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private tokens: AccountTokensService,
  ) {}

  async findAll(actor: JwtPayloadUser, query: ListUsersQueryDto) {
    const { page, pageSize, skip, take } = paginateParams(query);
    const where: Prisma.UserWhereInput = { tenantId: actor.tenantId };
    if (query.role) where.role = query.role;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return toPaginated(items, total, page, pageSize);
  }

  async findOne(id: string, actor: JwtPayloadUser) {
    const u = await this.prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: userSelect,
    });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  async create(dto: CreateUserDto, actor: JwtPayloadUser) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: actor.tenantId, email },
      },
    });
    if (exists) throw new ConflictException('Email ya registrado en el tenant');

    // Sin contraseña: se invita por email y el usuario la define al activar la cuenta
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : await unusablePasswordHash();
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId: actor.tenantId,
          email,
          name: dto.name,
          role: dto.role,
          passwordHash,
          active: dto.active ?? true,
        },
        select: userSelect,
      });
      await recordActivity(tx, {
        tenantId: actor.tenantId,
        actorId: actor.id,
        type: 'USER_CREATED',
        summary: `Usuario creado: ${created.name} (${ROLE_LABEL[created.role]})`,
        meta: { userId: created.id },
      });
      return created;
    });

    const invitationSent =
      !dto.password && user.active
        ? await this.tokens.send(user.id, UserTokenType.INVITE, actor.name)
        : false;
    return { ...user, invitationSent };
  }

  /** (Re)envía la invitación: sirve también para que un admin fuerce un cambio de contraseña. */
  async invite(id: string, actor: JwtPayloadUser) {
    const user = await this.findOne(id, actor);
    if (!user.active) throw new BadRequestException('El usuario está desactivado');
    const invitationSent = await this.tokens.send(user.id, UserTokenType.INVITE, actor.name);
    if (!invitationSent) {
      throw new ServiceUnavailableException('No se pudo enviar el email de invitación');
    }
    await recordActivity(this.prisma, {
      tenantId: actor.tenantId,
      actorId: actor.id,
      type: 'USER_INVITED',
      summary: `Invitación enviada de nuevo a ${user.name}`,
      meta: { userId: user.id },
    });
    return { invitationSent };
  }

  async update(id: string, dto: UpdateUserDto, actor: JwtPayloadUser) {
    const current = await this.findOne(id, actor);
    if (id === actor.id) {
      if (dto.role !== undefined && dto.role !== actor.role) {
        throw new BadRequestException('No puedes cambiar tu propio rol');
      }
      if (dto.active === false) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta');
      }
    }
    const data: { email?: string; name?: string; role?: Role; active?: boolean; passwordHash?: string; passwordChangedAt?: Date } = {};
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const taken = await this.prisma.user.findFirst({
        where: { tenantId: actor.tenantId, email, NOT: { id } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Email ya registrado en el tenant');
      data.email = email;
    }
    if (dto.name) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      data.passwordChangedAt = new Date(); // cierra las sesiones abiertas de ese usuario
    }

    // Enlaces de invitación/recuperación y códigos de acceso pendientes iban al correo anterior
    // (o servían para fijar una contraseña que el admin acaba de cambiar): dejan de valer.
    const revokePending = (data.email !== undefined && data.email !== current.email) || dto.password !== undefined;
    return this.prisma.$transaction(async (tx) => {
      if (revokePending) {
        await tx.userToken.deleteMany({ where: { userId: id, usedAt: null } });
        await tx.loginChallenge.deleteMany({ where: { userId: id, consumedAt: null } });
      }
      const updated = await tx.user.update({ where: { id }, data, select: userSelect });
      const changes = describeChanges(current, data);
      const activeChanged = dto.active !== undefined && dto.active !== current.active;
      if (activeChanged || changes.length) {
        const type = activeChanged ? (dto.active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED') : 'USER_UPDATED';
        const head = activeChanged
          ? `${dto.active ? 'Usuario reactivado' : 'Usuario desactivado'}: ${updated.name}`
          : `Usuario editado: ${updated.name}`;
        await recordActivity(tx, {
          tenantId: actor.tenantId,
          actorId: actor.id,
          type,
          summary: changes.length ? `${head} (${changes.join('; ')})` : head,
          meta: { userId: id },
        });
      }
      return updated;
    });
  }

  async remove(id: string, actor: JwtPayloadUser) {
    const current = await this.findOne(id, actor);
    if (id === actor.id) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { active: false } });
      if (current.active) {
        await recordActivity(tx, {
          tenantId: actor.tenantId,
          actorId: actor.id,
          type: 'USER_DEACTIVATED',
          summary: `Usuario desactivado: ${current.name}`,
          meta: { userId: id },
        });
      }
    });
    return { ok: true };
  }
}
