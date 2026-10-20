import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
import { EmptyToNull, IsId, IsIsoDateTime, IsYmd, TextField } from '../../common/validation/validators';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

/** Motivo de la cita y comentario al confirmar/cancelar. */
export const APPOINTMENT_TEXT_MAX = 500;

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
  @IsId('El abogado')
  lawyerId!: string;

  @ApiPropertyOptional({ description: 'Primer día (YYYY-MM-DD, hora local de la firma). Por defecto, hoy.' })
  @IsOptional()
  @IsYmd('from')
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
  @EmptyToNull()
  @IsId('El abogado')
  lawyerId?: string;

  @ApiPropertyOptional({ description: 'Cliente. Obligatorio cuando la crea el despacho.' })
  @IsOptional()
  @EmptyToNull()
  @IsId('El cliente')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Caso relacionado (debe ser del cliente)' })
  @IsOptional()
  @EmptyToNull()
  @IsId('El caso')
  caseId?: string;

  @ApiProperty({ example: '2026-10-05T14:00:00.000Z' })
  @IsIsoDateTime('startsAt')
  startsAt!: string;

  @ApiPropertyOptional({ description: 'Solo staff. Por defecto, la duración configurada en la firma.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ maxLength: APPOINTMENT_TEXT_MAX })
  @IsOptional()
  @TextField({ label: 'Motivo', max: APPOINTMENT_TEXT_MAX, multiline: true })
  reason?: string;
}

export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({ description: 'Desde (ISO). Por defecto, ahora.' })
  @IsOptional()
  @IsIsoDateTime('from')
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta (ISO). Debe ser posterior a «from».' })
  @IsOptional()
  @IsIsoDateTime('to')
  to?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Solo admin: filtrar por abogado' })
  @IsOptional()
  @IsId('El abogado')
  lawyerId?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: ['confirmada', 'cancelada', 'completada'] })
  @IsIn(['confirmada', 'cancelada', 'completada'], { message: 'status debe ser confirmada, cancelada o completada' })
  status!: 'confirmada' | 'cancelada' | 'completada';

  @ApiPropertyOptional({ maxLength: APPOINTMENT_TEXT_MAX, description: 'Comentario para la otra parte' })
  @IsOptional()
  @TextField({ label: 'Comentario', max: APPOINTMENT_TEXT_MAX, multiline: true })
  note?: string;
}
