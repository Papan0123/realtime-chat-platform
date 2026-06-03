import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { MessageStatus } from './message-status.enum';
import { Message } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
  ) {}

  async create(senderId: number, roomId: number, text: string) {
    const [sender, room] = await Promise.all([
      this.usersService.findById(senderId),
      this.roomsService.findOneForUser(roomId, senderId),
    ]);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    return this.messagesRepository.save(
      this.messagesRepository.create({
        sender,
        room,
        message: text,
        status: MessageStatus.Sent,
      }),
    );
  }

  async findByRoom(roomId: number, userId: number) {
    await this.roomsService.findOneForUser(roomId, userId);
    return this.messagesRepository.find({
      where: { room: { id: roomId } },
      order: { createdAt: 'ASC' },
    });
  }

  async markRoomAsRead(roomId: number, userId: number) {
    await this.roomsService.findOneForUser(roomId, userId);
    await this.messagesRepository.update(
      { room: { id: roomId } },
      { status: MessageStatus.Read },
    );
    return { roomId, status: MessageStatus.Read };
  }
}
