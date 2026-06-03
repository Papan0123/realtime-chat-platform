import { ArrayMinSize, IsArray, IsInt, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  memberIds: number[];
}
