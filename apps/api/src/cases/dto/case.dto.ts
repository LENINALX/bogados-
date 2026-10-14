import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CaseStatus } from '@prisma/client';

/** Número de proceso del SATJE: judicatura (5 dígitos) - año (4) - secuencial (5), con una letra final opcional */
export const PROCESS_NUMBER = /^\d{5}-\d{4}-\d{5}[A-Z]?$/;

/** Quita espacios y pasa a mayúsculas; vacío → null (desvincular). */
export function normalizeProcessNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.replace(/\s+/g, '').toUpperCase();
  return clean === '' ? null : clean;
}

export class CreateCaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  matterType?: string;

  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lawyerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  matterType?: string | null;

  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lawyerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
  @IsString()
  lawyerId!: string;
}

export class PatchStatusDto {
  @ApiProperty({ enum: ['intake', 'abierto', 'en_pausa', 'cerrado'] })
  @IsIn(['intake', 'abierto', 'en_pausa', 'cerrado'])
  status!: CaseStatus;

  @ApiPropertyOptional({ default: true, description: 'Avisar por email al cliente del caso' })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;

  @ApiPropertyOptional({ description: 'Explicación para el cliente: se ve en su portal y va en el email' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  clientMessage?: string;
}

export class ListCasesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiPropertyOptional({ description: 'Búsqueda por título/descripción' })
  @IsOptional()
  @IsString()
  q?: string;
}
