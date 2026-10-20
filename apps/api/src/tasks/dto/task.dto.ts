import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { MAX_TERM_DAYS } from '../../terms/business-days';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { EmptyToNull, IsId, IsIsoDateTime, IsYmd, TextField } from '../../common/validation/validators';

export const TASK_TITLE_MIN = 2;
export const TASK_TITLE_MAX = 200;

export class CreateTaskDto {
  @ApiProperty({ minLength: TASK_TITLE_MIN, maxLength: TASK_TITLE_MAX })
  @TextField({ label: 'Título', min: TASK_TITLE_MIN, max: TASK_TITLE_MAX })
  title!: string;

  @ApiPropertyOptional({
    example: '2026-10-15T18:00:00.000Z',
    description: 'Obligatorio salvo que se indique un término (termDays + notifiedOn)',
  })
  @ValidateIf((o: CreateTaskDto) => o.termDays === undefined)
  @IsIsoDateTime('dueAt')
  dueAt?: string;

  @ApiPropertyOptional({ example: 3, description: 'Término en días hábiles: el vencimiento lo calcula el servidor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'termDays debe ser un número entero de días hábiles' })
  @Min(1, { message: `El término debe ser de 1 a ${MAX_TERM_DAYS} días hábiles` })
  @Max(MAX_TERM_DAYS, { message: `El término debe ser de 1 a ${MAX_TERM_DAYS} días hábiles` })
  termDays?: number;

  @ApiPropertyOptional({ example: '2026-10-08', description: 'Fecha de notificación desde la que corre el término' })
  @ValidateIf((o: CreateTaskDto) => o.termDays !== undefined)
  @IsYmd('notifiedOn')
  notifiedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @EmptyToNull()
  @IsId('El responsable')
  assigneeId?: string | null;

  @ApiPropertyOptional({ description: 'Requerido si se crea vía /tasks' })
  @IsOptional()
  @IsId('El caso')
  caseId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ minLength: TASK_TITLE_MIN, maxLength: TASK_TITLE_MAX })
  @IsOptional()
  @TextField({ label: 'Título', min: TASK_TITLE_MIN, max: TASK_TITLE_MAX })
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIsoDateTime('dueAt')
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'done debe ser true o false' })
  done?: boolean;

  @ApiPropertyOptional({ description: 'null quita el responsable' })
  @IsOptional()
  @EmptyToNull()
  @IsId('El responsable')
  assigneeId?: string | null;
}

export class ListTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por caso' })
  @IsOptional()
  @IsId('El caso')
  caseId?: string;

  @ApiPropertyOptional({ description: 'solo vencidas sin completar' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'overdue debe ser true o false' })
  overdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'done debe ser true o false' })
  done?: boolean;
}
