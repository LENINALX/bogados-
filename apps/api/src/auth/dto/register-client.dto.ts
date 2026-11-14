import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EmailField } from './auth-fields';
import { IsId, TextField } from '../../common/validation/validators';
import { PASSWORD_MAX, PASSWORD_MIN } from './password.dto';

export class RegisterClientDto {
  @ApiProperty({ example: 'nombre@correo.ec' })
  @EmailField()
  email!: string;

  @ApiProperty({ example: 'Nombre' })
  @TextField({ label: 'Nombre del cliente', min: 2, max: 120, minMessage: 'Escribe el nombre del cliente' })
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
  @IsId('El caso')
  caseId?: string;
}
