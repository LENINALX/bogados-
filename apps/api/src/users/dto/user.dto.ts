import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { Role } from '@prisma/client';
import { PASSWORD_MAX, PASSWORD_MIN } from '../../auth/dto/password.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { EmailField, TextField } from '../../common/validation/validators';

export const USER_NAME_MIN = 2;
export const USER_NAME_MAX = 120;
export const USER_SEARCH_MAX = 200;

const roleMessage = `role debe ser uno de: ${Object.values(Role).join(', ')}`;
const passwordMinMessage = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
const passwordMaxMessage = `La contraseña admite como máximo ${PASSWORD_MAX} caracteres`;

export class CreateUserDto {
  @ApiProperty({ maxLength: 254 })
  @EmailField()
  email!: string;

  @ApiProperty({ minLength: USER_NAME_MIN, maxLength: USER_NAME_MAX })
  @TextField({ label: 'Nombre', min: USER_NAME_MIN, max: USER_NAME_MAX })
  name!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: roleMessage })
  role!: Role;

  @ApiPropertyOptional({
    minLength: PASSWORD_MIN,
    maxLength: PASSWORD_MAX,
    description: 'Contraseña temporal. Si se omite, se envía una invitación por email.',
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(PASSWORD_MIN, { message: passwordMinMessage })
  @MaxLength(PASSWORD_MAX, { message: passwordMaxMessage })
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 254 })
  @IsOptional()
  @EmailField()
  email?: string;

  @ApiPropertyOptional({ minLength: USER_NAME_MIN, maxLength: USER_NAME_MAX })
  @IsOptional()
  @TextField({ label: 'Nombre', min: USER_NAME_MIN, max: USER_NAME_MAX })
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: roleMessage })
  role?: Role;

  @ApiPropertyOptional({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(PASSWORD_MIN, { message: passwordMinMessage })
  @MaxLength(PASSWORD_MAX, { message: passwordMaxMessage })
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: roleMessage })
  role?: Role;

  @ApiPropertyOptional({ maxLength: USER_SEARCH_MAX })
  @IsOptional()
  @TextField({ label: 'Búsqueda', max: USER_SEARCH_MAX })
  q?: string;
}
