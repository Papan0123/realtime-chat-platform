import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsInt()
  roomId: number;

  @IsString()
  @MinLength(1)
  message: string;
}
