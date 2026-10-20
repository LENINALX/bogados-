import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TextField } from '../../common/validation/validators';

export const MESSAGE_MAX = 10000;

export class CreateMessageDto {
  @ApiProperty({ maxLength: MESSAGE_MAX })
  @TextField({ label: 'Mensaje', min: 1, max: MESSAGE_MAX, multiline: true })
  body!: string;
}

export class ListMessagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  override pageSize?: number = 50;
}
