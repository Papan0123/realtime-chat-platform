import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagesModule } from '../messages/messages.module';
import { RedisModule } from '../redis/redis.module';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [JwtModule, UsersModule, RoomsModule, MessagesModule, RedisModule],
  providers: [ChatGateway],
})
export class ChatModule {}
