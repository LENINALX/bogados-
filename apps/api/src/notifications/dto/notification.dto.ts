import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar solo no leídas' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'unreadOnly debe ser true o false' })
  unreadOnly?: boolean;
}
