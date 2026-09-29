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
  /** Emisión, en segundos (lo añade jsonwebtoken) */
  iat?: number;
};

/**
 * Un JWT emitido antes del último cambio de contraseña ya no vale: cambiarla
 * cierra las sesiones abiertas en otros dispositivos. Se compara por segundos
 * (la precisión de `iat`), así el login inmediatamente posterior sí es válido.
 */
export function issuedBeforePasswordChange(iat: number | undefined, changedAt: Date | null) {
  if (!changedAt) return false;
  return (iat ?? 0) < Math.floor(changedAt.getTime() / 1000);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayloadUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, active: true },
    });
    if (!user || issuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    };
  }
}
