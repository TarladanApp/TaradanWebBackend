import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './common/services/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async register(email: string, password: string) {
    const { data, error } = await this.supabaseService.getClient().auth.signUp({ 
      email, 
      password 
    });
    
    if (error) {
      throw new UnauthorizedException(error.message);
    }
    
    return { success: true, data };
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      throw new UnauthorizedException(error.message);
    }
    
    return { success: true, data };
  }

  async resetPassword(email: string) {
    const { error } = await this.supabaseService.getClient().auth.resetPasswordForEmail(email);
    
    if (error) {
      throw new UnauthorizedException(error.message);
    }
    
    return { success: true, message: 'Şifre sıfırlama bağlantısı gönderildi' };
  }
} 