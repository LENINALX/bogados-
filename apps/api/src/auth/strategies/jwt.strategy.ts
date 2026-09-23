import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayloadUser } from '../../common/decorators/current-user.decorator';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  name: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret', 'dev-only-change-me'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayloadUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, active: true },
    });
    if (!user) throw new UnauthorizedException('Token inválido');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    };
  }
}
