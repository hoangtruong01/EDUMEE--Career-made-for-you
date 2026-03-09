import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserVerifyStatus } from '../../../common/enums';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  user_id: string;
  email: string;
  role: string;
  token_type: number;
  verify: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.accessTokenSecret') ||
        configService.get<string>('JWT_SECRET_ACCESS_TOKEN') ||
        'default_secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.user_id as any);

    if (!user || user.verify === UserVerifyStatus.Banned) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị khóa',
      );
    }

    return {
      userId: payload.user_id,
      email: payload.email,
      role: payload.role,
      verify: payload.verify,
    };
  }
}
