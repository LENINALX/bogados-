import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function mockContext(user: { role: Role } | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite si no hay roles requeridos', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ role: Role.CLIENTE }))).toBe(true);
  });

  it('permite rol autorizado', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN, Role.ABOGADO]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ role: Role.ABOGADO }))).toBe(true);
  });

  it('bloquea rol no autorizado', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: string) =>
        key === ROLES_KEY ? [Role.ADMIN, Role.ABOGADO] : undefined,
      ),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(mockContext({ role: Role.CLIENTE }))).toThrow(
      ForbiddenException,
    );
  });
});
