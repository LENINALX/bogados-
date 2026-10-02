import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityBlockDto {
  @ApiProperty({ description: '0 = domingo … 6 = sábado', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @ApiProperty({ example: '09:00' })
  @Matches(HHMM, { message: 'start debe tener formato HH:MM' })
  start!: string;

  @ApiProperty({ example: '13:00' })
  @Matches(HHMM, { message: 'end debe tener formato HH:MM' })
  end!: string;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilityBlockDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityBlockDto)
  blocks!: AvailabilityBlockDto[];
}

export class SlotsQueryDto {
  @ApiProperty()
  @IsString()
  lawyerId!: string;

  @ApiPropertyOptional({ description: 'Primer día (YYYY-MM-DD, hora local de la firma). Por defecto, hoy.' })
  @IsOptional()
  @Matches(YMD, { message: 'from debe tener formato YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({ default: 14, minimum: 1, maximum: 31 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  days?: number;
}

export class CreateAppointmentDto {
  @ApiPropertyOptional({ description: 'Abogado. Obligatorio para clientes; el staff lo puede omitir (él mismo).' })
  @IsOptional()
  @IsString()
  lawyerId?: string;

  @ApiPropertyOptional({ description: 'Cliente. Obligatorio cuando la crea el despacho.' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Caso relacionado (debe ser del cliente)' })
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiProperty({ example: '2026-10-05T14:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({ description: 'Solo staff. Por defecto, la duración configurada en la firma.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({ description: 'Desde (ISO). Por defecto, ahora.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Solo admin: filtrar por abogado' })
  @IsOptional()
  @IsString()
  lawyerId?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: ['confirmada', 'cancelada', 'completada'] })
  @IsIn(['confirmada', 'cancelada', 'completada'])
  status!: 'confirmada' | 'cancelada' | 'completada';

  @ApiPropertyOptional({ maxLength: 500, description: 'Comentario para la otra parte' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
