import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    let user = null as Awaited<ReturnType<typeof this.prisma.user.findFirst>>;

    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      });
      if (!tenant) throw new UnauthorizedException('Credenciales inválidas');
      user = await this.prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId: tenant.id, email },
        },
      });
    } else {
      user = await this.prisma.user.findFirst({ where: { email } });
    }

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    };

    const accessToken = await this.jwt.signAsync(payload);

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
    };
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
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

    return client;
  }
}
