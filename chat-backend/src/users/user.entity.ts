import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from '../messages/message.entity';
import { RoomMember } from '../rooms/room-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  socketId?: string;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @OneToMany(() => RoomMember, (member) => member.user)
  memberships: RoomMember[];
}
