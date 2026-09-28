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
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let details: unknown;

    if (exception instanceof HttpException) {
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
