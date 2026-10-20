import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { TextField } from '../../common/validation/validators';

export const NOTE_MAX = 5000;

export class CreateNoteDto {
  @ApiProperty({ maxLength: NOTE_MAX })
  @TextField({ label: 'Nota', min: 1, max: NOTE_MAX, multiline: true })
  body!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isInternal debe ser true o false' })
  isInternal?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Solo para notas visibles: avisar por email al cliente del caso',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'notifyClient debe ser true o false' })
  notifyClient?: boolean;
}
