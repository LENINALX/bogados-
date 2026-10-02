import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CaseStatus } from '@prisma/client';

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
