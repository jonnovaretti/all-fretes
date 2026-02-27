import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Doe', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongpassword', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
