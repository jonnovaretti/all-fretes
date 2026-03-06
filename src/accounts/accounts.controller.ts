import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import { AccountListResponseDto } from './dto/account-list-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiOperation({ summary: 'List all accounts' })
  @ApiOkResponse({ type: [AccountListResponseDto] })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<AccountListResponseDto[]> {
    return this.accountsService.findAll();
  }

  @ApiOperation({ summary: 'Get an account by id' })
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiNotFoundResponse({ description: 'Account not found' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AccountResponseDto> {
    return this.accountsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create an account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.create(createAccountDto);
  }
}
