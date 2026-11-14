import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export type JwtPayloadUser = {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  name: string;
  /** Identificador del token de esta sesión (para revocarlo al cerrar sesión) */
  jti?: string;
  /** Caducidad del token, en segundos */
  tokenExp?: number;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
