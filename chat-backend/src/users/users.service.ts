import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  create(data: Partial<User>) {
    return this.usersRepository.save(this.usersRepository.create(data));
  }

  findByEmail(email: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  findPublicByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });
  }

  findById(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async setPresence(id: number, socketId: string | null, isOnline: boolean) {
    await this.usersRepository.update(id, {
      socketId: socketId ?? undefined,
      isOnline,
      lastSeen: isOnline ? undefined : new Date(),
    });
  }
}
