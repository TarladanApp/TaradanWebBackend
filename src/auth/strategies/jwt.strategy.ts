import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../common/services/supabase.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'), // Gerçek JWT secret
      passReqToCallback: true,
    });
    
    console.log('=== JWT Strategy Constructor ===');
    console.log('JWT Secret mevcut:', !!configService.get<string>('SUPABASE_JWT_SECRET'));
    console.log('JWT Secret uzunluğu:', configService.get<string>('SUPABASE_JWT_SECRET')?.length);
  }

  async validate(req: any, payload: any) {
    console.log('=== JWT Strategy Validate ===');
    console.log('JWT Payload:', payload);
    
    try {
      // JWT zaten doğrulandı, payload'dan user bilgilerini al
      const userId = payload.sub; // Supabase JWT'de user ID 'sub' alanında
      console.log('User ID from JWT:', userId);
      
      if (!userId) {
        console.error('User ID bulunamadı');
        throw new UnauthorizedException('Geçersiz token');
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
      
      return { 
        userId: userId,
        farmerId: farmerData.farmer_id,
        email: payload.email,
        farmer_name: farmerData.farmer_name,
        farmer_last_name: farmerData.farmer_last_name
      };
    } catch (error) {
      console.error('JWT Strategy validate hatası:', error);
      throw new UnauthorizedException('Yetkilendirme hatası');
    }
  }
} 