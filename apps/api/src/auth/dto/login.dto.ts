import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EmailField, TenantSlugField } from './auth-fields';
import { PASSWORD_MAX } from './password.dto';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.bogados' })
  @EmailField()
  email!: string;

  /**
   * Sin mínimo propio (basta con que no esté vacía): así cualquier contraseña equivocada sigue
   * el mismo camino, cuenta para el bloqueo y recibe el mismo mensaje. Con máximo: bcrypt solo
   * usa 72 bytes y las contraseñas nunca pueden ser más largas.
   */
  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(1, { message: 'Escribe tu contraseña' })
  @MaxLength(PASSWORD_MAX)
  password!: string;

  @ApiProperty({
    description: 'Slug (código) de la firma; el email solo es único dentro de cada firma',
    example: 'firma-demo',
  })
  @TenantSlugField()
  tenantSlug!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Mantener la sesión iniciada: el token dura 30 días en vez de 12 horas',
  })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
