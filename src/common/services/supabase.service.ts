import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;
  private serviceClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.logger.debug('Supabase bağlantısı başlatılıyor...');
    this.logger.debug('Supabase URL:', supabaseUrl);
    this.logger.debug('Supabase Key mevcut:', !!supabaseKey);
    this.logger.debug('Service Role Key mevcut:', !!serviceRoleKey);

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase URL veya Key eksik!');
      throw new Error('Supabase URL ve Key değerleri eksik!');
    }

    if (!serviceRoleKey) {
      this.logger.error('Service Role Key eksik!');
      throw new Error('Service Role Key değeri eksik!');
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey);
      this.logger.debug('Supabase bağlantısı başarılı');
    } catch (error) {
      this.logger.error('Supabase bağlantı hatası:', error);
      throw error;
    }

    try {
      this.serviceClient = createClient(supabaseUrl, serviceRoleKey);
      this.logger.debug('Service Role bağlantısı başarılı');
    } catch (error) {
      this.logger.error('Service Role bağlantı hatası:', error);
      throw error;
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      this.logger.error('Supabase istemcisi başlatılmamış!');
      throw new Error('Supabase istemcisi başlatılmamış!');
    }
    return this.client;
  }

  getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      this.logger.error('Service Role istemcisi başlatılmamış!');
      throw new Error('Service Role istemcisi başlatılmamış!');
    }
    return this.serviceClient;
  }
} 