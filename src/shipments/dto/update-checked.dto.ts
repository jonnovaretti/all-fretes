import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCheckedDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  checked: boolean;
}
