import { ApiProperty } from '@nestjs/swagger';

export class AccountListResponseDto {
  @ApiProperty({ example: '8c7d2c64-9b16-4f2f-9c7a-3b1f7c7b0b6a' })
  id: string;

  @ApiProperty({ example: 'Main Account' })
  name: string;

  @ApiProperty({ example: 'gofrete-user' })
  username: string;
}
