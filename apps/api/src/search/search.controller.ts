import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Búsqueda global: casos, clientes y documentos visibles para el usuario (máx. 5 por grupo)',
  })
  search(@CurrentUser() user: JwtPayloadUser, @Query() query: SearchQueryDto) {
    return this.searchService.search(user, query.q);
  }
}
