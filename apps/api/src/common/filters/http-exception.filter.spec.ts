import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BODY_TOO_LARGE_MESSAGE,
  HttpExceptionFilter,
  INVALID_JSON_MESSAGE,
  INVALID_URL_MESSAGE,
} from './http-exception.filter';

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

describe('HttpExceptionFilter: errores al leer la petición', () => {
  let logError: jest.SpyInstance;
  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => logError.mockRestore());

  /** Lo que hace Nest con el SyntaxError de body-parser (RoutesResolver.mapExternalException). */
  const asNest = (text: string) => new BadRequestException(text);

  it.each([
    "Expected property name or '}' in JSON at position 1",
    'Unexpected token } in JSON at position 10',
    'Unexpected end of JSON input',
    `Unexpected token 'x', "xyz" is not valid JSON`,
    'Unexpected non-whitespace character after JSON at position 4',
  ])('JSON roto («%s») → 400 en español', (text) => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(asNest(text), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: INVALID_JSON_MESSAGE }));
    expect(logError).not.toHaveBeenCalled();
  });

  it('el error crudo de body-parser (type entity.parse.failed) también', () => {
    const { host, status, json } = mockHost();
    const err = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
      status: 400,
      body: '{x',
    });
    new HttpExceptionFilter().catch(err, host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: INVALID_JSON_MESSAGE }));
  });

  it('cuerpo demasiado grande → 413 (antes acababa en 500)', () => {
    const { host, status, json } = mockHost();
    const err = Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 });
    new HttpExceptionFilter().catch(err, host);
    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: BODY_TOO_LARGE_MESSAGE }));
    expect(logError).not.toHaveBeenCalled();
  });

  it('URL con % mal codificado → 400 en español', () => {
    const { host, json } = mockHost();
    new HttpExceptionFilter().catch(asNest('URI malformed'), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: INVALID_URL_MESSAGE }));
  });

  it('no toca los 400 propios aunque mencionen JSON', () => {
    const { host, json } = mockHost();
    new HttpExceptionFilter().catch(new BadRequestException('Falta el campo JSON «meta»'), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Falta el campo JSON «meta»' }));
  });
});
