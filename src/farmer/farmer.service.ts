import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { Express } from 'express'; // Express tipini import ediyoruz

@Injectable()
export class FarmerService {
  private readonly logger = new Logger(FarmerService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async createFarmer(farmerData: CreateFarmerDto, farmer_certificates_file?: Express.Multer.File) {
    try {
      this.logger.debug('Çiftçi oluşturma isteği alındı:', farmerData);

      // 1. Supabase Auth kaydı oluştur
      const { data: authData, error: authError } = await this.supabaseService.getClient()
        .auth.signUp({
          email: farmerData.farmer_mail,
          password: farmerData.farmer_password,
        });

      if (authError) {
        this.logger.error('Auth kaydı hatası:', authError);
        throw new Error(`Auth kaydı hatası: ${authError.message}`);
      }

      const userId = authData.user?.id;

      // 2. Farmer tablosuna ilk kaydı ekle (Sertifika URL'si olmadan)
      const { data: farmerInsertData, error: farmerInsertError } = await this.supabaseService.getClient()
        .from('farmer')
        .insert([{
          farmer_password: farmerData.farmer_password, // Şifreyi kaydetmek genellikle iyi bir pratik değildir, auth kullanılıyorsa kaldırılmalı.
          farmer_name: farmerData.farmer_name,
          farmer_last_name: farmerData.farmer_last_name,
          farmer_age: farmerData.farmer_age,
          farmer_address: farmerData.farmer_address,
          farmer_city: farmerData.farmer_city,
          farmer_town: farmerData.farmer_town,
          famer_neighbourhood: farmerData.famer_neighbourhood,
          farmer_phone_number: farmerData.farmer_phone_number,
          farmer_mail: farmerData.farmer_mail,
          farmer_activity_status: farmerData.farmer_activity_status,
          farm_name: farmerData.farm_name,
          farmer_tc_no: farmerData.farmer_tc_no,
          imgurl: farmerData.imgurl,
          auth_id: userId
        }])
        .select();

      if (farmerInsertError) {
        this.logger.error('Farmer kaydı hatası:', farmerInsertError);
        if (userId) {
             await this.supabaseService.getClient().auth.admin.deleteUser(userId);
             this.logger.debug(`Auth kullanıcısı ${userId} farmer kaydı hatası nedeniyle silindi.`);
        }
        throw new Error(`Veritabanı hatası: ${farmerInsertError.message}`);
      }

      const createdFarmer = farmerInsertData[0];
      const farmerId = createdFarmer.farmer_id; // Yeni eklenen çiftçinin ID'si

      let certificateUrl = '';

      // 3. Sertifika dosyasını Supabase Storage'a yükle
      if (farmer_certificates_file && farmerId) {
        const bucketName = `${farmerId}`; // Bucket adı çiftçi ID'si olacak
        const filePath = `${farmer_certificates_file.originalname}`; // Dosya yolu sadece dosya adı olacak

        // **Önemli:** Bu noktada `bucketName` (yani farmerId) adında bir bucket'ın
        // Supabase Storage'da mevcut ve doğru izinlere sahip olduğundan emin olmalısınız.
        // Eğer bucket yoksa veya backend'in anahtarı (service_role gibi) bucket oluşturma
        // iznine sahip değilse bu yükleme başarısız olur.

        const { data: uploadData, error: uploadError } = await this.supabaseService.getClient()
          .storage
          .from(bucketName)
          .upload(filePath, farmer_certificates_file.buffer, {
            contentType: farmer_certificates_file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          this.logger.error(`Sertifika yükleme hatası (${bucketName}/${filePath}):`, uploadError);
           await this.supabaseService.getClient().from('farmer').delete().eq('farmer_id', farmerId);
           if (userId) {
                await this.supabaseService.getClient().auth.admin.deleteUser(userId);
           }
           throw new Error(`Sertifika yüklenirken hata oluştu: ${uploadError.message}`);
        }

        // Yüklenen dosyanın herkese açık URL'sini al
        // **Önemli:** Bucket'ın herkese açık (public) erişime izin verdiğinden emin olun.
        const { data: publicUrlData } = this.supabaseService.getClient()
          .storage
          .from(bucketName)
          .getPublicUrl(filePath);

        certificateUrl = publicUrlData.publicUrl;
        this.logger.debug('Sertifika URL:', certificateUrl);

        // 4. Farmer kaydını sertifika URL'si ile güncelle
        const { error: updateError } = await this.supabaseService.getClient()
          .from('farmer')
          .update({ farmer_certificates: certificateUrl })
          .eq('farmer_id', farmerId);

        if (updateError) {
          this.logger.error('Farmer kaydı güncelleme hatası (sertifika URL):', updateError);
           await this.supabaseService.getClient().from('farmer').delete().eq('farmer_id', farmerId);
           if (userId) {
                await this.supabaseService.getClient().auth.admin.deleteUser(userId);
           }
           await this.supabaseService.getClient().storage.from(bucketName).remove([filePath]);
           throw new Error(`Sertifika URL'si güncellenirken hata oluştu: ${updateError.message}`);
        }

      }

      this.logger.debug('Çiftçi başarıyla oluşturuldu:', createdFarmer);
      return { success: true, data: { ...createdFarmer, farmer_certificates: certificateUrl } };

    } catch (error) {
      this.logger.error('Çiftçi oluşturma genel hatası:', error);
      throw error;
    }
  }

  async getFarmerById(id: string) {
    try {
      this.logger.debug(`Çiftçi getirme isteği alındı. ID: ${id}`);

      const { data, error } = await this.supabaseService.getClient()
        .from('farmer')
        .select('*')
        .eq('farmer_id', id)
        .single();

      if (error) {
        this.logger.error('Supabase hatası:', error);
        throw new NotFoundException('Çiftçi bulunamadı');
      }

      this.logger.debug('Çiftçi bulundu:', data);
      return data;
    } catch (error) {
      this.logger.error('Çiftçi getirme hatası:', error);
      throw error;
    }
  }

  async updateFarmer(id: string, farmerData: CreateFarmerDto) {
    try {
      this.logger.debug(`Çiftçi güncelleme isteği alındı. ID: ${id}`);

      const { data, error } = await this.supabaseService.getClient()
        .from('farmer')
        .update({
          farmer_password: farmerData.farmer_password,
          farmer_name: farmerData.farmer_name,
          farmer_last_name: farmerData.farmer_last_name,
          farmer_age: farmerData.farmer_age,
          farmer_address: farmerData.farmer_address,
          farmer_city: farmerData.farmer_city,
          farmer_town: farmerData.farmer_town,
          famer_neighbourhood: farmerData.famer_neighbourhood,
          farmer_phone_number: farmerData.farmer_phone_number,
          farmer_mail: farmerData.farmer_mail,
          farmer_certificates: farmerData.farmer_certificates, // Bu alanın güncellenme mantığına bakmak gerekebilir
          farmer_activity_status: farmerData.farmer_activity_status,
          farm_name: farmerData.farm_name,
          farmer_tc_no: farmerData.farmer_tc_no,
          imgurl: farmerData.imgurl
        })
        .eq('farmer_id', id)
        .select();

      if (error) {
        this.logger.error('Supabase hatası:', error);
        throw new Error(`Veritabanı hatası: ${error.message}`);
      }

      this.logger.debug('Çiftçi başarıyla güncellendi:', data);
      return { success: true, data: data[0] };
    } catch (error) {
      this.logger.error('Çiftçi güncelleme hatası:', error);
      throw error;
    }
  }

  async deleteFarmer(id: string) {
    try {
      this.logger.debug(`Çiftçi silme isteği alındı. ID: ${id}`);

      // Önce farmer kaydını sil
      const { error: deleteFarmerError } = await this.supabaseService.getClient()
        .from('farmer')
        .delete()
        .eq('farmer_id', id);

      if (deleteFarmerError) {
        this.logger.error('Supabase hatası (farmer silme):', deleteFarmerError);
        throw new Error(`Veritabanı hatası: ${deleteFarmerError.message}`);
      }

       // İsteğe bağlı: Auth kullanıcısını da sil (farmer kaydından auth_id'yi almanız gerekebilir)

      this.logger.debug('Çiftçi başarıyla silindi');
      return { success: true, message: 'Çiftçi başarıyla silindi' };
    } catch (error) {
      this.logger.error('Çiftçi silme hatası:', error);
      throw error;
    }
  }
}