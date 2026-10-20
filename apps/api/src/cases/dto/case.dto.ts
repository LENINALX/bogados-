import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsIn,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { Transform } from 'class-transformer';
import { CaseStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { EmptyToNull, IsId, TextField } from '../../common/validation/validators';

/** Número de proceso del SATJE: judicatura (5 dígitos) - año (4) - secuencial (5), con una letra final opcional */
export const PROCESS_NUMBER = /^\d{5}-\d{4}-\d{5}[A-Z]?$/;

/** Límites compartidos con la solicitud del portal y con la web (NewCaseForm). */
export const CASE_TITLE_MIN = 2;
export const CASE_TITLE_MAX = 200;
export const CASE_DESCRIPTION_MAX = 5000;
export const CASE_MATTER_MAX = 100;
export const CLIENT_MESSAGE_MAX = 1000;
export const SEARCH_MAX = 200;

/** Quita espacios y pasa a mayúsculas; vacío → null (desvincular). */
export function normalizeProcessNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.replace(/\s+/g, '').toUpperCase();
  return clean === '' ? null : clean;
}

const statusMessage = `status debe ser uno de: ${Object.values(CaseStatus).join(', ')}`;

export class CreateCaseDto {
  @ApiProperty({ minLength: CASE_TITLE_MIN, maxLength: CASE_TITLE_MAX })
  @TextField({ label: 'Título', min: CASE_TITLE_MIN, max: CASE_TITLE_MAX })
  title!: string;

  @ApiPropertyOptional({ maxLength: CASE_DESCRIPTION_MAX })
  @IsOptional()
  @TextField({ label: 'Descripción', max: CASE_DESCRIPTION_MAX, multiline: true })
  description?: string;

  @ApiPropertyOptional({ maxLength: CASE_MATTER_MAX })
  @IsOptional()
  @TextField({ label: 'Materia', max: CASE_MATTER_MAX })
  matterType?: string;

  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus, { message: statusMessage })
  status?: CaseStatus;

  @ApiPropertyOptional({ description: 'Solo admin: el abogado siempre crea casos a su nombre' })
  @IsOptional()
  @EmptyToNull()
  @IsId('El abogado')
  lawyerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @EmptyToNull()
  @IsId('El cliente')
  clientId?: string | null;

  @ApiPropertyOptional({
    example: '13284-2024-00123',
    description: 'Número del proceso en el SATJE: judicatura (5) - año (4) - secuencial (5), con letra final opcional',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeProcessNumber(value))
  @ValidateIf((_, v) => v !== null)
  @Matches(PROCESS_NUMBER, { message: 'El número de proceso debe tener el formato 13284-2024-00123' })
  processNumber?: string | null;
}

export class UpdateCaseDto {
  @ApiPropertyOptional({ minLength: CASE_TITLE_MIN, maxLength: CASE_TITLE_MAX })
  @IsOptional()
  @TextField({ label: 'Título', min: CASE_TITLE_MIN, max: CASE_TITLE_MAX })
  title?: string;

  @ApiPropertyOptional({ maxLength: CASE_DESCRIPTION_MAX })
  @IsOptional()
  @TextField({ label: 'Descripción', max: CASE_DESCRIPTION_MAX, multiline: true })
  description?: string | null;

  @ApiPropertyOptional({ maxLength: CASE_MATTER_MAX })
  @IsOptional()
  @TextField({ label: 'Materia', max: CASE_MATTER_MAX })
  matterType?: string | null;

  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus, { message: statusMessage })
  status?: CaseStatus;

  @ApiPropertyOptional({ description: 'Solo admin (null desasigna)' })
  @IsOptional()
  @EmptyToNull()
  @IsId('El abogado')
  lawyerId?: string | null;

  @ApiPropertyOptional({ description: 'Solo admin (null desvincula)' })
  @IsOptional()
  @EmptyToNull()
  @IsId('El cliente')
  clientId?: string | null;

  @ApiPropertyOptional({
    example: '13284-2024-00123',
    description: 'Número del proceso en el SATJE: judicatura (5) - año (4) - secuencial (5), con letra final opcional',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeProcessNumber(value))
  @ValidateIf((_, v) => v !== null)
  @Matches(PROCESS_NUMBER, { message: 'El número de proceso debe tener el formato 13284-2024-00123' })
  processNumber?: string | null;
}

export class AssignLawyerDto {
  @ApiProperty()
  @IsId('El abogado')
  lawyerId!: string;
}

export class PatchStatusDto {
  @ApiProperty({ enum: ['intake', 'abierto', 'en_pausa', 'cerrado'] })
  @IsIn(['intake', 'abierto', 'en_pausa', 'cerrado'], { message: statusMessage })
  status!: CaseStatus;

  @ApiPropertyOptional({ default: true, description: 'Avisar por email al cliente del caso' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'notifyClient debe ser true o false' })
  notifyClient?: boolean;

  @ApiPropertyOptional({
    maxLength: CLIENT_MESSAGE_MAX,
    description: 'Explicación para el cliente: se ve en su portal y va en el email',
  })
  @IsOptional()
  @TextField({ label: 'Mensaje para el cliente', max: CLIENT_MESSAGE_MAX, multiline: true })
  clientMessage?: string;
}

export class ListCasesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus, { message: statusMessage })
  status?: CaseStatus;

  @ApiPropertyOptional({ description: 'Búsqueda por título/descripción', maxLength: SEARCH_MAX })
  @IsOptional()
  @TextField({ label: 'Búsqueda', max: SEARCH_MAX })
  q?: string;
}
