import { IsInt } from 'class-validator';

export class CreatePrivateRoomDto {
  @IsInt()
  userId: number;
}
