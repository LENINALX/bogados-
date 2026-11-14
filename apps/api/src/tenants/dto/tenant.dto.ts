import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength, ValidateBy } from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { EmailField, EmptyToNull, TextField, Trim, TrimLower, OptionalNotNull } from '../../common/validation/validators';
import { brandColorProblem, phoneProblem, websiteProblem } from '../branding';

export const FIRM_NAME_MIN = 2;
export const ADDRESS_MAX = 200;
export const WEBSITE_MAX = 200;

/** Valida con una función que devuelve el problema (o null); el mensaje es el problema. */
function Checked(name: string, problem: (value: string) => string | null): PropertyDecorator {
  return ValidateBy({
    name,
    validator: {
      validate: (value: unknown) => typeof value === 'string' && problem(value) === null,
      defaultMessage: (args) => (typeof args?.value === 'string' && problem(args.value)) || 'Valor no válido',
    },
  });
}
export const FIRM_NAME_MAX = 120;

export class UpdateTenantDto {
  @ApiProperty({ required: false, minLength: FIRM_NAME_MIN, maxLength: FIRM_NAME_MAX })
  @OptionalNotNull('El nombre de la firma')
  @TextField({ label: 'Nombre de la firma', min: FIRM_NAME_MIN, max: FIRM_NAME_MAX })
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Exige verificación en dos pasos a admin y abogados (los clientes la activan si quieren)',
  })
  @OptionalNotNull('La verificación en dos pasos')
  @ToBoolean()
  @IsBoolean({ message: 'La verificación en dos pasos debe ser sí o no' })
  requireTwoFactor?: boolean;

  // ── Identidad y contacto: "" o null borran el dato ──
  // (las transformaciones van de arriba abajo: EmptyToNull, al final, ve el texto ya recortado)

  @ApiProperty({ required: false, nullable: true, example: '#1f3d38', description: 'Con contraste AA para texto blanco' })
  @IsOptional()
  @TrimLower()
  @Checked('brandColor', brandColorProblem)
  @EmptyToNull()
  brandColor?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Email de contacto: responde a los emails de la firma' })
  @IsOptional()
  @EmailField()
  @EmptyToNull()
  contactEmail?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '+593 2 123 4567' })
  @IsOptional()
  @Trim()
  @MaxLength(25, { message: 'El teléfono admite como máximo 25 caracteres' })
  @Checked('contactPhone', phoneProblem)
  @EmptyToNull()
  contactPhone?: string | null;

  @ApiProperty({ required: false, nullable: true, maxLength: ADDRESS_MAX })
  @IsOptional()
  @TextField({ label: 'Dirección', max: ADDRESS_MAX })
  @EmptyToNull()
  address?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'https://mifirma.ec' })
  @IsOptional()
  @Trim()
  @MaxLength(WEBSITE_MAX, { message: `La web admite como máximo ${WEBSITE_MAX} caracteres` })
  @Checked('website', websiteProblem)
  @EmptyToNull()
  website?: string | null;
}
