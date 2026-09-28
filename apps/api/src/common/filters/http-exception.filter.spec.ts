import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'PATCH', url: '/api/v1/users/u1' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe('HttpExceptionFilter', () => {
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => logError.mockRestore());

  it('respeta HttpException y no la registra como error', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(new BadRequestException('Dato inválido'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Dato inválido' }));
    expect(logError).not.toHaveBeenCalled();
  });

  it.each([
    ['P2002', 409],
    ['P2003', 400],
    ['P2025', 404],
  ])('Prisma %s → %i', (code, expected) => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(prismaError(code), host);
    expect(status).toHaveBeenCalledWith(expected);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ details: code }));
    expect(logError).not.toHaveBeenCalled();
  });

  it('error inesperado → 500 genérico y se registra con stack', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(new Error('conexión perdida'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Error interno del servidor' }),
    );
    expect(logError).toHaveBeenCalledWith(
      'PATCH /api/v1/users/u1 → 500',
      expect.stringContaining('conexión perdida'),
    );
  });

  it('código Prisma no mapeado → 500 y se registra', () => {
    const { host, status } = mockHost();
    new HttpExceptionFilter().catch(prismaError('P1001'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(logError).toHaveBeenCalled();
  });
});
