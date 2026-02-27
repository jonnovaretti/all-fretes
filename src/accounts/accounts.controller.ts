import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountResponseDto } from './dto/account-response.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiOperation({ summary: 'Create an account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @Post()
  async create(
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.create(createAccountDto);
  }
}
