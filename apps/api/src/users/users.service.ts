import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
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
  }

  async update(id: string, dto: UpdateUserDto, actor: JwtPayloadUser) {
    await this.findOne(id, actor);
    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.name) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(id: string, actor: JwtPayloadUser) {
    await this.findOne(id, actor);
    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }
}
