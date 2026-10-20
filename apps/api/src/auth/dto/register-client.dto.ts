import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EmailField } from './auth-fields';
import { PASSWORD_MAX, PASSWORD_MIN } from './password.dto';

export class RegisterClientDto {
  @ApiProperty({ example: 'nuevo.cliente@ejemplo.com' })
  @EmailField()
  email!: string;

  @ApiProperty({ example: 'Nuevo Cliente' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Escribe el nombre del cliente' })
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    minLength: PASSWORD_MIN,
    maxLength: PASSWORD_MAX,
    description: 'Contraseña temporal. Si se omite, se envía una invitación por email.',
  })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` })
  @MaxLength(PASSWORD_MAX)
  @Matches(/\S/, { message: 'La contraseña no puede ser solo espacios' })
  password?: string;

  @ApiPropertyOptional({ description: 'Caso al que vincular el cliente (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  caseId?: string;
}
