import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.bogados' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'Slug (código) de la firma; el email solo es único dentro de cada firma',
    example: 'firma-demo',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsString()
  @MinLength(1)
  tenantSlug!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Mantener la sesión iniciada: el token dura 30 días en vez de 12 horas',
  })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
