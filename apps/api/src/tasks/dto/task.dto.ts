import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Matches, Max, Min, ValidateIf } from 'class-validator';
import { MAX_TERM_DAYS, YMD } from '../../terms/business-days';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: '2026-10-15T18:00:00.000Z',
    description: 'Obligatorio salvo que se indique un término (termDays + notifiedOn)',
  })
  @ValidateIf((o: CreateTaskDto) => o.termDays === undefined)
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ example: 3, description: 'Término en días hábiles: el vencimiento lo calcula el servidor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TERM_DAYS)
  termDays?: number;

  @ApiPropertyOptional({ example: '2026-10-08', description: 'Fecha de notificación desde la que corre el término' })
  @ValidateIf((o: CreateTaskDto) => o.termDays !== undefined)
  @Matches(YMD, { message: 'notifiedOn debe tener formato AAAA-MM-DD' })
  notifiedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @ApiPropertyOptional({ description: 'Requerido si se crea vía /tasks' })
  @IsOptional()
  @IsString()
  caseId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}

export class ListTasksQueryDto {
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

  @ApiPropertyOptional({ description: 'Filtrar por caso' })
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiPropertyOptional({ description: 'solo vencidas sin completar' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  done?: boolean;
}
