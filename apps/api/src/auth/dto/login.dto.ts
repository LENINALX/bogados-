import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.bogados' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    required: false,
    description: 'Slug del tenant (opcional si el email es único)',
    example: 'firma-demo',
  })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
