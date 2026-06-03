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
import { CreateGroupDto } from './dto/create-group.dto';
import { CreatePrivateRoomDto } from './dto/create-private-room.dto';
import { MemberDto } from './dto/member.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('rooms')
  getRooms(@CurrentUser() user: JwtUser) {
    return this.roomsService.findForUser(user.sub);
  }

  @Get('rooms/:id')
  getRoom(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.roomsService.findOneForUser(id, user.sub);
  }

  @Post('rooms/private')
  createPrivateRoom(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePrivateRoomDto,
  ) {
    return this.roomsService.createPrivateRoom(user.sub, dto.userId);
  }

  @Post('group/create')
  createGroup(@CurrentUser() user: JwtUser, @Body() dto: CreateGroupDto) {
    return this.roomsService.createGroup(user.sub, dto.name, dto.memberIds);
  }

  @Post('group/add-member')
  addMember(@Body() dto: MemberDto) {
    return this.roomsService.addMember(dto.roomId, dto.userId);
  }

  @Post('group/remove-member')
  removeMember(@Body() dto: MemberDto) {
    return this.roomsService.removeMember(dto.roomId, dto.userId);
  }
}
