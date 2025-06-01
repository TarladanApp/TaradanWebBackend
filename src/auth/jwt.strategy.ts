import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../common/services/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly supabaseService: SupabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'XoEw6oXoSuwX5y8kIAAZOKl0+1dW5aIqW9JoBa9XYmhCqZsBo5t0fLfRq7D1tBjwQQStG9a9Xd0U3l8XQqVHsA==',
    });
  }

  async validate(payload: any) {
    try {
      console.log('JWT Strategy - Payload:', JSON.stringify(payload, null, 2));
      
      // Payload'dan user ID'yi al
      const userId = payload.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID bulunamadı');
      }
      
      // Farmer bilgilerini Supabase'den çek
      const { data: farmerData, error } = await this.supabaseService.getClient()
        .from('farmer')
        .select('farmer_id, farmer_name, farmer_last_name, auth_id')
        .eq('auth_id', userId)
        .single();

      console.log('Farmer data query result:', { farmerData, error });

      if (error || !farmerData) {
        throw new UnauthorizedException('Farmer bilgisi bulunamadı: ' + (error?.message || 'Veri yok'));
      }

      const user = {
        id: userId,
      email: payload.email,
        farmer_id: farmerData.farmer_id,
        farmer_name: farmerData.farmer_name,
        farmer_last_name: farmerData.farmer_last_name,
      };

      console.log('JWT Strategy - Returning user:', user);
      return user;
    } catch (error) {
      console.error('JWT Strategy Error:', error);
      throw new UnauthorizedException('Token doğrulanamadı: ' + error.message);
    }
  }
} 