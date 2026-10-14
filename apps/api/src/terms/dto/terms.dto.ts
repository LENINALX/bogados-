import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MAX_TERM_DAYS, YMD } from '../business-days';

export class TermDeadlineQueryDto {
  @ApiProperty({ example: '2026-10-08', description: 'Fecha de la notificación (no cuenta)' })
  @Matches(YMD, { message: 'notifiedOn debe tener formato AAAA-MM-DD' })
  notifiedOn!: string;

  @ApiProperty({ example: 3, description: 'Días hábiles del término' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TERM_DAYS)
  days!: number;
}

export class HolidaysQueryDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-11-04' })
  @Matches(YMD, { message: 'date debe tener formato AAAA-MM-DD' })
  date!: string;

  @ApiProperty({ example: 'Fundación de Manta' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}
