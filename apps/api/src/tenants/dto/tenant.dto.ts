import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { FIRM_SLUG } from '../../auth/dto/register-firm.dto';
import { TextField, TrimLower } from '../../common/validation/validators';

export const FIRM_NAME_MIN = 2;
export const FIRM_NAME_MAX = 120;

export class UpdateTenantDto {
  @ApiProperty({ required: false, minLength: FIRM_NAME_MIN, maxLength: FIRM_NAME_MAX })
  @IsOptional()
  @TextField({ label: 'Nombre de la firma', min: FIRM_NAME_MIN, max: FIRM_NAME_MAX })
  name?: string;

  @ApiProperty({ required: false, description: 'Mismas reglas que al registrar la firma' })
  @IsOptional()
  @TrimLower()
  @IsString({ message: 'El código de firma debe ser texto' })
  @Matches(FIRM_SLUG, {
    message: 'El código de firma lleva de 3 a 40 letras minúsculas, números o guiones (sin guion al principio ni al final)',
  })
  slug?: string;

  @ApiProperty({
    required: false,
    description: 'Exige verificación en dos pasos a admin y abogados (los clientes la activan si quieren)',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'requireTwoFactor debe ser true o false' })
  requireTwoFactor?: boolean;
}
