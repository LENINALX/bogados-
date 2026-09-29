import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterClientDto {
  @ApiProperty({ example: 'nuevo.cliente@ejemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nuevo Cliente' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    minLength: 6,
    description: 'Contraseña temporal. Si se omite, se envía una invitación por email.',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Caso al que vincular el cliente (opcional)' })
  @IsOptional()
  @IsString()
  caseId?: string;
}
