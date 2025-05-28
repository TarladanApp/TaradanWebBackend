import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { Express } from 'express'; // Express tipini import ediyoruz
import { LoginFarmerDto } from './dto/create-farmer.dto'; // DTO dosyası aynı yerde
import { ActivityStatus } from './dto/create-farmer.dto'; // Enum dosyası aynı yerde

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
      const farmerId = createdFarmer.farmer_id;

      let certificateUrl = '';

      // 3. Sertifika dosyasını Supabase Storage'a yükle
      if (farmer_certificates_file && farmerId) {
        const bucketName = 'farmer-documents';
        const filePath = `${farmerId}/${farmer_certificates_file.originalname}`;

        // Service role client ile dosya yükleme
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
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

        // Yüklenen dosyanın imzalı URL'sini al (100 yıl geçerli)
        const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .createSignedUrl(filePath, 315360000); // 100 yıl saniye cinsinden

        if (signedUrlError) {
          this.logger.error(`İmzalı URL oluşturma hatası (${bucketName}/${filePath}):`, signedUrlError);
          // Hata durumunda yüklenen dosyayı ve farmer kaydını temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          await this.supabaseService.getServiceClient().from('farmer').delete().eq('farmer_id', farmerId);
          if (userId) {
            await this.supabaseService.getServiceClient().auth.admin.deleteUser(userId);
          }
          throw new Error(`İmzalı URL oluşturulurken hata oluştu: ${signedUrlError.message}`);
        }

        certificateUrl = signedUrlData.signedUrl;
        this.logger.debug('Sertifika İmzalı URL:', certificateUrl);

        // 4. Sertifika bilgisini farmer_certificate tablosuna ekle
        const { data: certificateInsertData, error: certificateInsertError } = await this.supabaseService.getServiceClient()
          .from('farmer_certificate')
          .insert([
            {
              farmer_id: farmerId,
              images: certificateUrl
            }
          ])
          .select();

        if (certificateInsertError) {
          this.logger.error('farmer_certificate kaydı hatası:', certificateInsertError);
          // Hata durumunda yüklenen dosyayı ve farmer kaydını temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          await this.supabaseService.getServiceClient().from('farmer').delete().eq('farmer_id', farmerId);
          if (userId) {
            await this.supabaseService.getServiceClient().auth.admin.deleteUser(userId);
          }
          throw new Error(`farmer_certificate kaydı oluşturulurken hata oluştu: ${certificateInsertError.message}`);
        }

        this.logger.debug('Sertifika bilgisi farmer_certificate tablosuna eklendi:', certificateInsertData[0]);
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

  async loginFarmer(loginData: LoginFarmerDto) {
    try {
      this.logger.debug('Çiftçi giriş isteği alındı:', loginData.farmer_mail);

      // 1. Supabase Auth ile giriş yap
      const { data: authData, error: authError } = await this.supabaseService.getClient()
        .auth.signInWithPassword({
          email: loginData.farmer_mail,
          password: loginData.farmer_password,
        });

      if (authError) {
        this.logger.error('Auth giriş hatası:', authError);
        throw new Error(`Giriş hatası: ${authError.message}`);
      }

      const userId = authData.user?.id;

      if (!userId) {
         throw new Error('Auth kullanıcısı bulunamadı.');
      }

      // 2. Farmer tablosundan aktivite durumunu kontrol et
      const { data: farmerData, error: farmerError } = await this.supabaseService.getClient()
        .from('farmer')
        .select('farmer_activity_status')
        .eq('auth_id', userId)
        .single();

      if (farmerError) {
        this.logger.error('Farmer durumu çekme hatası:', farmerError);
        throw new Error(`Veritabanı hatası: ${farmerError.message}`);
      }

      if (!farmerData) {
           throw new Error('Çiftçi bilgisi bulunamadı.');
      }

      if (farmerData.farmer_activity_status !== ActivityStatus.Active) {
        // İsteğe bağlı: Burada kullanıcının oturumunu kapatabilirsiniz
        // await this.supabaseService.getClient().auth.signOut();
        this.logger.warn(`Aktif olmayan çiftçi girişi engellendi: ${loginData.farmer_mail}`);
        throw new Error('Hesabınız aktif değil. Lütfen yöneticinizle iletişime geçin.');
      }

      this.logger.debug('Çiftçi başarıyla giriş yaptı:', loginData.farmer_mail);
      // Başarılı giriş durumunda Auth verilerini döndürebilirsiniz veya ihtiyacınız olan başka bilgileri
      return { success: true, message: 'Giriş başarılı', user: authData.user, farmer: farmerData };

    } catch (error) {
      this.logger.error('Çiftçi giriş genel hatası:', error);
      throw error;
    }
  }
}