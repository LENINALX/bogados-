import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export type PaginatedMeta = {
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginatedMeta;
};

export function paginateParams(query: PaginationQueryDto): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function toPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return { items, meta: { total, page, pageSize } };
}
