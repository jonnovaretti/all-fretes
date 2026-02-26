import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return this.issueTokensForUser(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return null;
    }

    return user;
  }

  async login(user: User) {
    return this.issueTokensForUser(user);
  }

  private async issueTokensForUser(user: User) {
    const tokens = await this.buildTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.usersService.toUserResponse(user),
      ...tokens,
    };
  }

  private async buildTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, admin: user.admin };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
        expiresIn: this.getConfigValue('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
        expiresIn: this.getConfigValue('JWT_REFRESH_TTL', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      this.getHashRounds(),
    );
    await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);
  }

  private getConfigValue(key: string, fallback: string): string {
    return this.configService.get<string>(key) ?? fallback;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not set`);
    }
    return value;
  }

  private getHashRounds(): number {
    const raw = this.configService.get<string>('USER_PASSWORD_SALT_ROUNDS');
    const parsed = Number(raw ?? 10);
    if (!Number.isInteger(parsed) || parsed < 4 || parsed > 31) {
      return 10;
    }
    return parsed;
  }
}
