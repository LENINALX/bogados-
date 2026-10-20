import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { EmailField, TenantSlugField } from './auth-fields';

/** bcrypt solo usa los primeros 72 bytes: más largo daría una falsa sensación de seguridad. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export class ForgotPasswordDto {
  @ApiProperty({ example: 'firma-demo' })
  @TenantSlugField()
  tenantSlug!: string;

  @ApiProperty({ example: 'admin@demo.bogados' })
  @EmailField()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token del enlace recibido por email' })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` })
  @MaxLength(PASSWORD_MAX)
  @Matches(/\S/, { message: 'La contraseña no puede ser solo espacios' })
  password!: string;
}
