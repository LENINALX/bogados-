import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { TextField } from '../../common/validation/validators';
import { SEARCH_MAX } from '../../cases/dto/case.dto';

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Texto a buscar en casos (título, descripción, materia, nº de proceso, cliente), clientes y documentos',
    maxLength: SEARCH_MAX,
  })
  @IsOptional()
  @TextField({ label: 'Búsqueda', max: SEARCH_MAX })
  q?: string;
}
