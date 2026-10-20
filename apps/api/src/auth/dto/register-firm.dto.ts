import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EmailField } from './auth-fields';
import { PASSWORD_MAX, PASSWORD_MIN } from './password.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Código de firma: minúsculas, números y guiones; ni empieza ni acaba en guion. */
export const FIRM_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export class RegisterFirmDto {
  @ApiProperty({ example: 'Estudio Jurídico Mejía' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Escribe el nombre de la firma' })
  @MaxLength(120)
  firmName!: string;

  @ApiProperty({ example: 'estudio-mejia', description: 'Con este código entra el equipo de la firma' })
  @Transform(lower)
  @IsString()
  @Matches(FIRM_SLUG, {
    message: 'El código de firma lleva de 3 a 40 letras minúsculas, números o guiones (sin guion al principio ni al final)',
  })
  slug!: string;

  @ApiProperty({ example: 'Paola Mejía' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Escribe tu nombre' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'paola@estudiomejia.ec' })
  @EmailField()
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` })
  @MaxLength(PASSWORD_MAX)
  @Matches(/\S/, { message: 'La contraseña no puede ser solo espacios' })
  password!: string;
}
