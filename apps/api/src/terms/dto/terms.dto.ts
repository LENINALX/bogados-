import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_TERM_DAYS } from '../business-days';
import { DATE_YEAR_MAX, DATE_YEAR_MIN, IsYmd, TextField } from '../../common/validation/validators';

export const HOLIDAY_NAME_MIN = 2;
export const HOLIDAY_NAME_MAX = 100;

export class TermDeadlineQueryDto {
  @ApiProperty({ example: '2026-10-08', description: 'Fecha de la notificación (no cuenta)' })
  @IsYmd('notifiedOn')
  notifiedOn!: string;

  @ApiProperty({ example: 3, description: 'Días hábiles del término' })
  @Type(() => Number)
  @IsInt({ message: 'days debe ser un número entero de días hábiles' })
  @Min(1, { message: `El término debe ser de 1 a ${MAX_TERM_DAYS} días hábiles` })
  @Max(MAX_TERM_DAYS, { message: `El término debe ser de 1 a ${MAX_TERM_DAYS} días hábiles` })
  days!: number;
}

export class HolidaysQueryDto {
  @ApiProperty({ example: 2026, minimum: DATE_YEAR_MIN, maximum: DATE_YEAR_MAX })
  @Type(() => Number)
  @IsInt({ message: 'year debe ser un año (número entero)' })
  @Min(DATE_YEAR_MIN, { message: `year debe estar entre ${DATE_YEAR_MIN} y ${DATE_YEAR_MAX}` })
  @Max(DATE_YEAR_MAX, { message: `year debe estar entre ${DATE_YEAR_MIN} y ${DATE_YEAR_MAX}` })
  year!: number;
}

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-11-04' })
  @IsYmd('date')
  date!: string;

  @ApiProperty({ example: 'Fundación de Manta', minLength: HOLIDAY_NAME_MIN, maxLength: HOLIDAY_NAME_MAX })
  @TextField({ label: 'Nombre del feriado', min: HOLIDAY_NAME_MIN, max: HOLIDAY_NAME_MAX })
  name!: string;
}
