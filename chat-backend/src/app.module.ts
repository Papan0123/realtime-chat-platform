import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { Message } from './messages/message.entity';
import { MessagesModule } from './messages/messages.module';
import { RoomMember } from './rooms/room-member.entity';
import { ChatRoom } from './rooms/room.entity';
import { RoomsModule } from './rooms/rooms.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_DATABASE', 'realtime_chat'),
        entities: [User, ChatRoom, RoomMember, Message],
        synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
      }),
    }),
    UsersModule,
    AuthModule,
    RoomsModule,
    MessagesModule,
    ChatModule,
  ],
})
export class AppModule {}
