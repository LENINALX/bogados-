import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug solo minúsculas, números y guiones' })
  slug?: string;

  @ApiProperty({
    required: false,
    description: 'Exige verificación en dos pasos a admin y abogados (los clientes la activan si quieren)',
  })
  @IsOptional()
  @IsBoolean()
  requireTwoFactor?: boolean;
}
