import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PASSWORD_MAX, PASSWORD_MIN } from './password.dto';

export class VerifyLoginDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  challengeId!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 dígitos' })
  code!: string;
}

export class ResendLoginCodeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  challengeId!: string;
}

export class UpdateTwoFactorDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ description: 'Contraseña actual: confirma que quien lo cambia es el titular' })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX)
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` })
  @MaxLength(PASSWORD_MAX)
  newPassword!: string;
}

export class ListLoginEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['success', 'failed'] })
  @IsOptional()
  @IsIn(['success', 'failed'])
  result?: 'success' | 'failed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}
