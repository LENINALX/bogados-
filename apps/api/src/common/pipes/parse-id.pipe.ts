import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidId } from '../validation/validators';

/**
 * Valida un id de la ruta (`:id`, `:caseId`) antes de que llegue a Prisma:
 * un id de 10 000 caracteres o con caracteres raros es un 400, no una consulta.
 *
 *   @Param('id', ParseIdPipe) id: string
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown, metadata: ArgumentMetadata): string {
    if (isValidId(value)) return value;
    const name = metadata.data ? ` (${metadata.data})` : '';
    throw new BadRequestException(`El identificador de la ruta no es válido${name}`);
  }
}
