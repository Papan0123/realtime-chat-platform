import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RoomMember } from './room-member.entity';
import { RoomType } from './room-type.enum';
import { ChatRoom } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomsRepository: Repository<ChatRoom>,
    @InjectRepository(RoomMember)
    private readonly membersRepository: Repository<RoomMember>,
    private readonly usersService: UsersService,
  ) {}

  async createPrivateRoom(currentUserId: number, otherUserId: number) {
    const otherUser = await this.usersService.findById(otherUserId);
    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    const userIds = [currentUserId, otherUserId].sort((a, b) => a - b);
    const roomName = `room_${userIds[0]}_${userIds[1]}`;
    const existingRoom = await this.roomsRepository.findOne({
      where: { name: roomName, type: RoomType.Private },
    });
    if (existingRoom) {
      return this.findOneForUser(existingRoom.id, currentUserId);
    }

    const room = await this.roomsRepository.save(
      this.roomsRepository.create({
        name: roomName,
        type: RoomType.Private,
      }),
    );
    await this.addMembers(room.id, userIds);
    return this.findOneForUser(room.id, currentUserId);
  }

  async createGroup(ownerId: number, name: string, memberIds: number[]) {
    const room = await this.roomsRepository.save(
      this.roomsRepository.create({ name, type: RoomType.Group }),
    );
    await this.addMembers(
      room.id,
      Array.from(new Set([ownerId, ...memberIds])),
    );
    return this.findOneForUser(room.id, ownerId);
  }

  async addMember(roomId: number, userId: number) {
    await this.addMembers(roomId, [userId]);
    return this.roomsRepository.findOne({
      where: { id: roomId },
      relations: { members: { user: true } },
    });
  }

  async removeMember(roomId: number, userId: number) {
    await this.membersRepository.delete({
      room: { id: roomId },
      user: { id: userId },
    });
    return { removed: true };
  }

  async findForUser(userId: number) {
    const memberships = await this.membersRepository.find({
      where: { user: { id: userId } },
      relations: { room: true },
      order: { joinedAt: 'DESC' },
    });
    return memberships.map((membership) => membership.room);
  }

  async findOneForUser(roomId: number, userId: number) {
    const membership = await this.membersRepository.findOne({
      where: { room: { id: roomId }, user: { id: userId } },
      relations: { room: { members: { user: true } } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }
    return membership.room;
  }

  private async addMembers(roomId: number, userIds: number[]) {
    const room = await this.roomsRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const users = await Promise.all(
      userIds.map((id) => this.usersService.findById(id)),
    );
    const foundUsers = users.filter(Boolean);
    if (foundUsers.length !== userIds.length) {
      throw new NotFoundException('One or more users were not found');
    }

    const existing = await this.membersRepository.find({
      where: { room: { id: roomId }, user: { id: In(userIds) } },
      relations: { user: true },
    });
    const existingIds = new Set(existing.map((member) => member.user.id));
    const members = foundUsers
      .filter((user) => user && !existingIds.has(user.id))
      .map((user) => this.membersRepository.create({ room, user: user! }));

    if (members.length) {
      await this.membersRepository.save(members);
    }
  }
}
