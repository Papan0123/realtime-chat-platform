import { IsInt } from 'class-validator';

export class RoomEventDto {
  @IsInt()
  roomId: number;
}
