import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ChatRoom } from './room.entity';

@Entity('room_members')
@Unique(['room', 'user'])
export class RoomMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatRoom, (room) => room.members, { onDelete: 'CASCADE' })
  room: ChatRoom;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}
