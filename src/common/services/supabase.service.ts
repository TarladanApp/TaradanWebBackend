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

    console.log('--- Supabase Config Check ---');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('SUPABASE_KEY mevcut:', !!supabaseKey);
    console.log('SUPABASE_SERVICE_ROLE_KEY mevcut:', !!serviceRoleKey);
    console.log('---------------------------');

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
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      });
      this.logger.debug('Supabase bağlantısı başarılı');
    } catch (error) {
      this.logger.error('Supabase bağlantı hatası:', error);
      throw error;
    }

    try {
      this.serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      });
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

  async uploadFile(bucketName: string, filePath: string, file: Buffer, contentType: string) {
    try {
      const { data, error } = await this.serviceClient.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType,
          upsert: false
        });

      if (error) {
        this.logger.error(`Dosya yükleme hatası (${bucketName}/${filePath}):`, error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Dosya yükleme hatası:', error);
      throw error;
    }
  }

  async getSignedUrl(bucketName: string, filePath: string, expiresIn: number = 315360000) {
    try {
      const { data, error } = await this.serviceClient.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        this.logger.error(`İmzalı URL oluşturma hatası (${bucketName}/${filePath}):`, error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('İmzalı URL oluşturma hatası:', error);
      throw error;
    }
  }
} 