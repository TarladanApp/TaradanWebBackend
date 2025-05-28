import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    this.logger.debug('Supabase bağlantısı başlatılıyor...');
    this.logger.debug('Supabase URL:', supabaseUrl);
    this.logger.debug('Supabase Key mevcut:', !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase URL veya Key eksik!');
      throw new Error('Supabase URL ve Key değerleri eksik!');
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.debug('Supabase bağlantısı başarılı');
    } catch (error) {
      this.logger.error('Supabase bağlantı hatası:', error);
      throw error;
    }
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      this.logger.error('Supabase istemcisi başlatılmamış!');
      throw new Error('Supabase istemcisi başlatılmamış!');
    }
    return this.supabase;
  }
} 