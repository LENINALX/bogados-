import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCaseRequestDto {
  @ApiProperty({ example: 'Despido sin liquidación' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Laboral' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  matterType?: string;

  @ApiProperty({ description: 'Qué ocurrió y qué necesita el cliente' })
  @IsString()
  @MinLength(10, { message: 'Cuéntanos un poco más (mínimo 10 caracteres)' })
  @MaxLength(5000)
  description!: string;
}

export const CASE_DECISIONS = ['aceptar', 'aplazar', 'rechazar'] as const;
export type CaseDecision = (typeof CASE_DECISIONS)[number];

export class DecideCaseRequestDto {
  @ApiProperty({ enum: CASE_DECISIONS })
  @IsIn(CASE_DECISIONS)
  decision!: CaseDecision;

  @ApiPropertyOptional({ description: 'Se envía al cliente. Obligatorio al rechazar.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Al aceptar: abogado responsable (por defecto, quien acepta)' })
  @IsOptional()
  @IsString()
  lawyerId?: string;
}
