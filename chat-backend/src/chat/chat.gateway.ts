import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import type { JwtUser } from '../common/types/jwt-user.type';
import { MessagesService } from '../messages/messages.service';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { RoomEventDto } from './dto/room-event.dto';
import { SendMessageEventDto } from './dto/send-message-event.dto';

type AuthenticatedSocket = Socket & { user?: JwtUser };
type MessageEvent = {
  roomId: number;
  message: unknown;
};

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
    private readonly redisService: RedisService,
  ) {}

  async afterInit() {
    await this.redisService.subscribe<MessageEvent>(
      'message_channel',
      (event) => {
        this.server
          .to(this.roomName(event.roomId))
          .emit('receive_message', event.message);
      },
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      });
      client.user = payload;
      await this.usersService.setPresence(payload.sub, client.id, true);
      this.server.emit('presence_changed', {
        userId: payload.sub,
        isOnline: true,
      });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) {
      return;
    }
    await this.usersService.setPresence(client.user.sub, null, false);
    this.server.emit('presence_changed', {
      userId: client.user.sub,
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  @SubscribeMessage('join_room')
  async joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: RoomEventDto,
  ) {
    if (!client.user) {
      return;
    }
    await this.roomsService.findOneForUser(dto.roomId, client.user.sub);
    await client.join(this.roomName(dto.roomId));
    client.emit('joined_room', { roomId: dto.roomId });
  }

  @SubscribeMessage('leave_room')
  async leaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: RoomEventDto,
  ) {
    await client.leave(this.roomName(dto.roomId));
    client.emit('left_room', { roomId: dto.roomId });
  }

  @SubscribeMessage('join_group')
  async joinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: RoomEventDto,
  ) {
    return this.joinRoom(client, dto);
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageEventDto,
  ) {
    if (!client.user) {
      return;
    }
    const message = await this.messagesService.create(
      client.user.sub,
      dto.roomId,
      dto.message,
    );
    this.redisService.publish<MessageEvent>('message_channel', {
      roomId: dto.roomId,
      message,
    });
    this.server.to(this.roomName(dto.roomId)).emit('receive_message', message);
  }

  @SubscribeMessage('message_read')
  async messageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: RoomEventDto,
  ) {
    if (!client.user) {
      return;
    }
    const result = await this.messagesService.markRoomAsRead(
      dto.roomId,
      client.user.sub,
    );
    this.server
      .to(this.roomName(dto.roomId))
      .emit('message_status_updated', result);
  }

  @SubscribeMessage('typing_start')
  typingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: RoomEventDto,
  ) {
    client.to(this.roomName(dto.roomId)).emit('typing_start', {
      roomId: dto.roomId,
      userId: client.user?.sub,
    });
  }

  @SubscribeMessage('typing_stop')
  typingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: RoomEventDto,
  ) {
    client.to(this.roomName(dto.roomId)).emit('typing_stop', {
      roomId: dto.roomId,
      userId: client.user?.sub,
    });
  }

  private extractToken(client: Socket) {
    const auth = client.handshake.auth as { token?: unknown };
    const authToken = auth.token;
    if (typeof authToken === 'string') {
      return authToken;
    }
    const header = client.handshake.headers.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  }

  private roomName(roomId: number) {
    return `room:${roomId}`;
  }
}
