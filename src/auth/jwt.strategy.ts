import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: configService.get('TOKEN_SECRET'),
      audience: 'auth-provider:auth',
    });
  }

  async validate(payload: any) {
    const userId = parseInt(payload.sub);
    if (isNaN(userId)) {
      throw Error('UserId not valid');
    }
    if (!payload.address) {
      throw Error('No address in token');
    }
    return { id: userId, address: payload.address };
  }
}
