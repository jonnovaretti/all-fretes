import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user and issue tokens' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login and issue tokens' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @Post('login')
  async login(
    @Body() _loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const user = req.user as User;
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile data' })
  @ApiOkResponse({ type: UserResponseDto })
  @Get('profile')
  async profile(@Req() req: Request): Promise<UserResponseDto> {
    const user = req.user as User;
    const userProfile = await this.authService.getProfile(user.id);

    if (!userProfile) {
      throw new NotFoundException();
    }

    return { name: userProfile.name, email: userProfile.email };
  }
}
