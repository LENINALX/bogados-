import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { IsId, TextField } from '../../common/validation/validators';
import {
  CASE_DESCRIPTION_MAX,
  CASE_MATTER_MAX,
  CASE_TITLE_MAX,
  CASE_TITLE_MIN,
  CLIENT_MESSAGE_MAX,
} from './case.dto';

export const REQUEST_DESCRIPTION_MIN = 10;

export class CreateCaseRequestDto {
  @ApiProperty({ example: 'Despido sin liquidación', minLength: CASE_TITLE_MIN, maxLength: CASE_TITLE_MAX })
  @TextField({ label: 'Título', min: CASE_TITLE_MIN, max: CASE_TITLE_MAX })
  title!: string;

  @ApiPropertyOptional({ example: 'Laboral', maxLength: CASE_MATTER_MAX })
  @IsOptional()
  @TextField({ label: 'Materia', max: CASE_MATTER_MAX })
  matterType?: string;

  @ApiProperty({ description: 'Qué ocurrió y qué necesita el cliente', maxLength: CASE_DESCRIPTION_MAX })
  @TextField({
    label: 'Descripción',
    min: REQUEST_DESCRIPTION_MIN,
    max: CASE_DESCRIPTION_MAX,
    multiline: true,
    minMessage: `Cuéntanos un poco más (mínimo ${REQUEST_DESCRIPTION_MIN} caracteres)`,
  })
  description!: string;
}

export const CASE_DECISIONS = ['aceptar', 'aplazar', 'rechazar'] as const;
export type CaseDecision = (typeof CASE_DECISIONS)[number];

export class DecideCaseRequestDto {
  @ApiProperty({ enum: CASE_DECISIONS })
  @IsIn(CASE_DECISIONS, { message: 'decision debe ser aceptar, aplazar o rechazar' })
  decision!: CaseDecision;

  @ApiPropertyOptional({ description: 'Se envía al cliente. Obligatorio al rechazar.', maxLength: CLIENT_MESSAGE_MAX })
  @IsOptional()
  @TextField({ label: 'Motivo', max: CLIENT_MESSAGE_MAX, multiline: true })
  reason?: string;

  @ApiPropertyOptional({ description: 'Al aceptar: abogado responsable (por defecto, quien acepta)' })
  @IsOptional()
  @IsId('El abogado')
  lawyerId?: string;
}
