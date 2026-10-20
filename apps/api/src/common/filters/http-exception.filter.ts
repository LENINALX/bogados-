import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Errores conocidos de Prisma que son culpa de la petición, no del servidor. */
const PRISMA_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con esos datos' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referencia a un registro inexistente' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro no encontrado' },
  // Conflicto entre transacciones serializables simultáneas
  P2034: { status: HttpStatus.CONFLICT, message: 'Otra operación cambió estos datos a la vez. Inténtalo de nuevo.' },
};

export const INVALID_JSON_MESSAGE = 'El cuerpo de la petición no es un JSON válido';
export const BODY_TOO_LARGE_MESSAGE = 'El cuerpo de la petición es demasiado grande';
export const INVALID_URL_MESSAGE = 'La dirección de la petición no es válida';

/** Textos de JSON.parse (V8) que Nest reenvía tal cual como BadRequestException. */
const JSON_PARSE_TEXT = /in JSON at position|JSON input|is not valid JSON|after JSON/;

/**
 * Errores de body-parser / Express antes de llegar al controlador. Nest convierte
 * SyntaxError y URIError en `BadRequestException(err.message)` (texto en inglés del
 * parser); el resto (p. ej. cuerpo demasiado grande) llega crudo con `type` y `status`.
 */
export function mapRequestParsingError(exception: unknown): { status: HttpStatus; message: string } | null {
  if (exception instanceof HttpException) {
    if (exception.getStatus() !== HttpStatus.BAD_REQUEST) return null;
    const res = exception.getResponse();
    const message =
      typeof res === 'string' ? res : (res as { message?: unknown } | null)?.message;
    if (typeof message !== 'string') return null;
    if (JSON_PARSE_TEXT.test(message)) return { status: HttpStatus.BAD_REQUEST, message: INVALID_JSON_MESSAGE };
    if (message === 'URI malformed') return { status: HttpStatus.BAD_REQUEST, message: INVALID_URL_MESSAGE };
    return null;
  }
  const type = (exception as { type?: unknown } | null)?.type;
  if (type === 'entity.parse.failed' || (exception instanceof SyntaxError && 'body' in exception)) {
    return { status: HttpStatus.BAD_REQUEST, message: INVALID_JSON_MESSAGE };
  }
  if (type === 'entity.too.large') {
    return { status: HttpStatus.PAYLOAD_TOO_LARGE, message: BODY_TOO_LARGE_MESSAGE };
  }
  if (exception instanceof URIError) {
    return { status: HttpStatus.BAD_REQUEST, message: INVALID_URL_MESSAGE };
  }
  return null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let details: unknown;

    const parsing = mapRequestParsingError(exception);
    if (parsing) {
      ({ status, message } = parsing);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string | string[]) || exception.message;
        details = obj.error;
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      PRISMA_ERRORS[exception.code]
    ) {
      ({ status, message } = PRISMA_ERRORS[exception.code]);
      details = exception.code;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const req = ctx.getRequest<{ method?: string; url?: string }>();
      this.logger.error(
        `${req?.method} ${req?.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: Array.isArray(message) ? message.join('; ') : message,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
