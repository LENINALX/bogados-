import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto, ListMessagesQueryDto } from './dto/message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cases/:caseId/messages', version: '1' })
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mensajes del caso (paginado)' })
  list(
    @Param('caseId') caseId: string,
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messages.list(caseId, user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Enviar mensaje' })
  create(
    @Param('caseId') caseId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.messages.create(caseId, dto, user);
  }
}
