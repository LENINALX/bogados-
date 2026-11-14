import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { SEARCH_MAX } from '../../cases/dto/case.dto';
import { TextField } from '../../common/validation/validators';
import { EXPORT_FORMATS, ExportFormat } from '../export-files';

const formatMessage = 'El formato debe ser Excel (xlsx) o PDF (pdf)';

export class ExportClientsQueryDto {
  @ApiProperty({ enum: EXPORT_FORMATS })
  @IsIn(EXPORT_FORMATS, { message: formatMessage })
  format!: ExportFormat;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre o email', maxLength: SEARCH_MAX })
  @IsOptional()
  @TextField({ label: 'Búsqueda', max: SEARCH_MAX })
  q?: string;
}

/** Los mismos filtros que el listado de casos del panel. */
export class ExportCasesQueryDto extends ExportClientsQueryDto {
  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus, { message: 'El estado debe ser Ingreso, Abierto, En pausa o Cerrado' })
  status?: CaseStatus;
}
