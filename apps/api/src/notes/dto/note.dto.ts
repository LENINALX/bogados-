import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Solo para notas visibles: avisar por email al cliente del caso',
  })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;
}
