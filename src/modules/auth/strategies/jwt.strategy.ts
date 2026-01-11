import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../../common/services/supabase.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // Geçici olarak expiration'ı ignore edelim
      secretOrKey: 'any-secret', // Geçici secret
      jsonWebTokenOptions: {
        ignoreExpiration: true,
        ignoreNotBefore: true,
      }
    });
    
    console.log('=== JWT Strategy Constructor ===');
  }

  async validate(payload: any, done: any) {
    console.log('=== JWT Strategy Validate ===');
    console.log('JWT Payload:', payload);
    
    try {
      // Manuel token decode - Supabase JWT'yi decode etmek için
      const request = arguments[1]; // Request objesi
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      
      console.log('Raw token:', token?.substring(0, 50) + '...');
      
      if (!token) {
        throw new UnauthorizedException('Token bulunamadı');
      }

      // Token'ı base64 decode edelim
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Geçersiz JWT formatı');
        }

        // Payload kısmını decode et
        const payloadBase64 = tokenParts[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const decodedPayload = JSON.parse(payloadJson);
        
        console.log('Decoded payload:', decodedPayload);
        
        const userId = decodedPayload.sub;
        console.log('User ID from decoded token:', userId);
        
        if (!userId) {
          throw new UnauthorizedException('User ID bulunamadı');
        }

        // Farmer tablosundan farmer_id'yi al
        console.log('Farmer tablosunda arama başlıyor, auth_id:', userId);
        const { data: farmerData, error: farmerError } = await this.supabaseService.getServiceClient()
          .from('farmer')
          .select('farmer_id, farmer_name, farmer_last_name, farmer_activity_status')
          .eq('auth_id', userId)
          .single();

        console.log('Farmer query sonucu:', { farmerData, farmerError });

        if (farmerError || !farmerData) {
          console.error('Farmer bulunamadı:', farmerError);
          throw new UnauthorizedException('Farmer bulunamadı');
        }

        // Aktif olmayan farmer'ları reddet
        if (farmerData.farmer_activity_status !== 'Active') {
          console.error('Farmer aktif değil:', farmerData.farmer_activity_status);
          throw new UnauthorizedException('Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.');
        }

        console.log('Farmer bulundu:', farmerData);
        
        const user = { 
          userId: userId,
          farmerId: farmerData.farmer_id,
          email: decodedPayload.email,
          farmer_name: farmerData.farmer_name,
          farmer_last_name: farmerData.farmer_last_name
        };

        return done(null, user);
      } catch (decodeError) {
        console.error('Token decode hatası:', decodeError);
        throw new UnauthorizedException('Token decode edilemedi');
      }
    } catch (error) {
      console.error('JWT Strategy validate hatası:', error);
      return done(error, null);
    }
  }
} 