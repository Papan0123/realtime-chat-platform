import { IsInt } from 'class-validator';

export class MemberDto {
  @IsInt()
  roomId: number;

  @IsInt()
  userId: number;
}
