import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getMessages(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.messagesService.findByRoom(roomId, user.sub);
  }

  @Post()
  sendMessage(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser() user: JwtUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.create(user.sub, roomId, dto.message);
  }
}
