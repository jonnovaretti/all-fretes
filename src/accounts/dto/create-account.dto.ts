import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  loginUrl?: string;

  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
