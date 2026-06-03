import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from '../messages/message.entity';
import { RoomMember } from './room-member.entity';
import { RoomType } from './room-type.enum';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ enum: RoomType, type: 'enum' })
  type: RoomType;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RoomMember, (member) => member.room, { cascade: true })
  members: RoomMember[];

  @OneToMany(() => Message, (message) => message.room)
  messages: Message[];
}
