import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { IsId, IsYmd } from '../../common/validation/validators';
import { ACTIVITY_CATEGORIES, ActivityCategory } from '../activity.service';

const CATEGORIES = Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[];

export class ListFirmActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES, { message: `category debe ser uno de: ${CATEGORIES.join(', ')}` })
  category?: ActivityCategory;

  @ApiPropertyOptional({ description: 'Quién hizo la acción' })
  @IsOptional()
  @IsId('actorId')
  actorId?: string;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Desde este día (hora de la firma), incluido' })
  @IsOptional()
  @IsYmd('from')
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Hasta este día (hora de la firma), incluido' })
  @IsOptional()
  @IsYmd('to')
  to?: string;
}
