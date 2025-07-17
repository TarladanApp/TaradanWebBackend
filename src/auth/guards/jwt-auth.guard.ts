import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    console.log('=== Custom JWT Guard ===');
    console.log('Headers:', request.headers);
    
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Authorization header eksik veya yanlış format');
      throw new UnauthorizedException('Token bulunamadı');
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar
    console.log('Token alındı:', token.substring(0, 50) + '...');

    try {
      // Token'ı base64 decode et
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
      console.log('User ID from token:', userId);
      
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
      
      // User bilgilerini request'e ekle
      request.user = { 
        userId: userId,
        farmerId: farmerData.farmer_id,
        email: decodedPayload.email,
        farmer_name: farmerData.farmer_name,
        farmer_last_name: farmerData.farmer_last_name
      };

      console.log('Request user set:', request.user);
      return true;
    } catch (error) {
      console.error('JWT Guard hatası:', error);
      throw new UnauthorizedException('Yetkilendirme hatası: ' + error.message);
    }
  }
} 