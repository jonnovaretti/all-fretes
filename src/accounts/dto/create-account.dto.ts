import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Main Account', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/mock/login' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ApiProperty({ example: 'gofrete-user' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ example: 'secret' })
  @IsString()
  @MinLength(1)
  password: string;
}
