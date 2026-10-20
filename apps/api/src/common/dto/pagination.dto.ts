import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Página más alta admitida: más allá, el OFFSET solo sirve para cargar la base de datos. */
export const PAGE_MAX = 10_000;
export const PAGE_SIZE_MAX = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: PAGE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser 1 o mayor' })
  @Max(PAGE_MAX, { message: `page no puede pasar de ${PAGE_MAX}` })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: PAGE_SIZE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize debe ser un número entero' })
  @Min(1, { message: 'pageSize debe ser 1 o mayor' })
  @Max(PAGE_SIZE_MAX, { message: `pageSize no puede pasar de ${PAGE_SIZE_MAX}` })
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
  const page = Math.min(PAGE_MAX, Math.max(1, Math.trunc(Number(query.page)) || 1));
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Math.trunc(Number(query.pageSize)) || 20));
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
