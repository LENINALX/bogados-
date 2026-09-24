import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Firma Norte' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'firma-norte' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug solo minúsculas, números y guiones' })
  slug!: string;
}

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
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;
}
