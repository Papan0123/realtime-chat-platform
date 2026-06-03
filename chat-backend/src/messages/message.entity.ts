import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatRoom } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { MessageStatus } from './message-status.enum';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  sender: User;

  @ManyToOne(() => ChatRoom, (room) => room.messages, { onDelete: 'CASCADE' })
  room: ChatRoom;

  @Column('text')
  message: string;

  @Column({ enum: MessageStatus, type: 'enum', default: MessageStatus.Sent })
  status: MessageStatus;

  @CreateDateColumn()
  createdAt: Date;
}
