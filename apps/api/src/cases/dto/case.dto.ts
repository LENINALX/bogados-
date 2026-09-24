import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';
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
