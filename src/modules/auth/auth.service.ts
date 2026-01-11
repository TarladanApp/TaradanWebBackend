import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../../common/services/supabase.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Supabase auth error:', error);
        throw new UnauthorizedException('Giriş başarısız: ' + error.message);
      }

      if (!data.user) {
        throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    return data.user;
    } catch (error) {
      console.error('Validate user error:', error);
      throw new UnauthorizedException('Kullanıcı doğrulanamadı: ' + error.message);
    }
  }

  async login(user: any) {
    try {
      const payload = { 
        email: user.email, 
        sub: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 saat
      };

      const token = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '24h'
      });

    return {
        access_token: token,
        expires_in: 24 * 60 * 60, // 24 saat (saniye cinsinden)
        token_type: 'Bearer'
    };
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Token oluşturulamadı: ' + error.message);
    }
  }
} 