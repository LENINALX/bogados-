import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { documentUploadOptions } from './upload.config';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ version: '1' })
export class DocumentsController {
  constructor(private documents: DocumentsService) {}

  @Get('cases/:caseId/documents')
  @ApiOperation({ summary: 'Listar documentos del caso (ACL, paginado)' })
  list(
    @Param('caseId') caseId: string,
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.documents.list(caseId, user, query);
  }

  @Post('cases/:caseId/documents')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        sharedWithClient: { type: 'string', example: 'true' },
      },
    },
  })
  @ApiOperation({ summary: 'Subir documento (multipart)' })
  upload(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    const shared = (req.body as { sharedWithClient?: string })?.sharedWithClient;
    return this.documents.upload(caseId, file, shared, user);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Descargar documento con ACL' })
  download(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    // StreamableFile ya fija Content-Type, Content-Disposition y Content-Length
    return this.documents.download(id, user);
  }
}
