import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '8c7d2c64-9b16-4f2f-9c7a-3b1f7c7b0b6a' })
  id?: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: false })
  admin?: boolean;

  @ApiProperty({ example: '2024-06-01T12:34:56.000Z' })
  createdAt?: Date;
}
