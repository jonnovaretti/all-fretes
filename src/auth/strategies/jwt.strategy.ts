import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
  admin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JwtStrategy.getSecret(configService),
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, admin: payload.admin };
  }

  private static getSecret(configService: ConfigService): string {
    const value = configService.get<string>('JWT_ACCESS_SECRET');
    if (!value) {
      throw new Error('JWT_ACCESS_SECRET is not set');
    }
    return value;
  }
}
