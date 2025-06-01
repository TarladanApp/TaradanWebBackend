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

      // 2. Farmer tablosuna ilk kaydı ekle
      const { data: farmerInsertData, error: farmerInsertError } = await this.supabaseService.getClient()
        .from('farmer')
        .insert([{
          farmer_password: farmerData.farmer_password,
          farmer_name: farmerData.farmer_name,
          farmer_last_name: farmerData.farmer_last_name,
          farmer_age: farmerData.farmer_age,
          farmer_address: farmerData.farmer_address,
          farmer_city: farmerData.farmer_city,
          farmer_town: farmerData.farmer_town,
          farmer_neighbourhood: farmerData.farmer_neighbourhood,
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
        try {
        const bucketName = 'farmer-documents';
          const fileExt = farmer_certificates_file.originalname.split('.').pop();
          const filePath = `${farmerId}/sertifika.${fileExt}`;

        // Service role client ile dosya yükleme
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, farmer_certificates_file.buffer, {
            contentType: farmer_certificates_file.mimetype,
              upsert: true,
          });

        if (uploadError) {
          this.logger.error(`Sertifika yükleme hatası (${bucketName}/${filePath}):`, uploadError);
          throw new Error(`Sertifika yüklenirken hata oluştu: ${uploadError.message}`);
        }

        // Yüklenen dosyanın imzalı URL'sini al (100 yıl geçerli)
        const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
            .createSignedUrl(filePath, 315360000);

        if (signedUrlError) {
          this.logger.error(`İmzalı URL oluşturma hatası (${bucketName}/${filePath}):`, signedUrlError);
            // Hata durumunda yüklenen dosyayı temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
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
            // Hata durumunda yüklenen dosyayı temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
            throw new Error(`farmer_certificate kaydı oluşturulurken hata oluştu: ${certificateInsertError.message}`);
          }

          this.logger.debug('Sertifika bilgisi farmer_certificate tablosuna eklendi:', certificateInsertData[0]);
        } catch (error) {
          this.logger.error('Sertifika yükleme hatası:', error);
          // Hata durumunda farmer kaydını temizle
          await this.supabaseService.getServiceClient().from('farmer').delete().eq('farmer_id', farmerId);
          if (userId) {
            await this.supabaseService.getServiceClient().auth.admin.deleteUser(userId);
          }
          throw error;
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

      const updatePayload: any = { ...farmerData }; // farmer_age artık DTO'da number olduğu için dönüştürmeye gerek yok
      // farmer_certificates alanı updatePayload'dan çıkarılmalı veya doğru yönetilmeli
      // DTO'dan kaldırıldığı için burada da kaldırıyoruz.
       delete updatePayload.farmer_certificates; // Bu satır artık gereksiz ama emin olmak için silebiliriz

      const { data, error } = await this.supabaseService.getClient()
        .from('farmer')
        .update(updatePayload)
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
      const accessToken = authData.session?.access_token;

      if (!userId || !accessToken) {
         throw new Error('Auth kullanıcısı veya token bulunamadı.');
      }

      // 2. Farmer tablosundan farmer_id ve aktivite durumunu kontrol et
      const { data: farmerData, error: farmerError } = await this.supabaseService.getClient()
        .from('farmer')
        .select('farmer_id, farmer_activity_status, farmer_name, farmer_last_name')
        .eq('auth_id', userId)
        .single();

      if (farmerError) {
        this.logger.error('Farmer durumu çekme hatası:', farmerError);
        throw new Error(`Veritabanı hatası: ${farmerError.message}`);
      }

      if (!farmerData) {
           throw new Error('Çiftçi bilgisi bulunamadı.');
      }

      // Kesin string kontrolü: Sadece 'Active' olanlar giriş yapabilsin
      if (farmerData.farmer_activity_status !== 'Active') {
        this.logger.warn(`Aktif olmayan çiftçi girişi engellendi: ${loginData.farmer_mail}`);
        throw new Error('Hesabınız aktif değil. Lütfen yöneticinizle iletişime geçin.');
      }

      this.logger.debug('Çiftçi başarıyla giriş yaptı:', loginData.farmer_mail);
      return { 
        success: true, 
        message: 'Giriş başarılı', 
        user: {
          ...authData.user,
          farmer_id: farmerData.farmer_id,
          farmer_name: farmerData.farmer_name,
          farmer_last_name: farmerData.farmer_last_name
        },
        token: accessToken,
        farmer: farmerData 
      };

    } catch (error) {
      this.logger.error('Çiftçi giriş genel hatası:', error);
      throw error;
    }
  }

  // Mağaza bilgilerini getir
  async getStoreInfo(farmerId: string) {
    try {
      this.logger.debug(`Mağaza bilgileri getiriliyor. Farmer ID: ${farmerId}`);

      // Farmer bilgilerini al - first() kullan
      const { data: farmerDataArray, error: farmerError } = await this.supabaseService.getServiceClient()
        .from('farmer')
        .select('farmer_biografi, farm_name')
        .eq('farmer_id', farmerId)
        .limit(1);

      if (farmerError) {
        this.logger.error('Farmer bilgisi alma hatası:', farmerError);
        throw new Error(`Farmer bilgileri alınamadı: ${farmerError.message}`);
      }

      const farmerData = farmerDataArray?.[0] || null;

      // Farmer resimlerini al (fresh URL'ler ile)
      const imagesData = await this.getFarmImages(farmerId);

      // Farmer sertifikalarını al (fresh URL'ler ile)
      const certificatesData = await this.getFarmCertificates(farmerId);

      this.logger.debug('Mağaza bilgileri başarıyla alındı');
      
      return {
        farmer_biografi: farmerData?.farmer_biografi || '',
        farm_name: farmerData?.farm_name || '',
        images: imagesData || [],
        certificates: certificatesData || []
      };
    } catch (error) {
      this.logger.error('Mağaza bilgileri getirme hatası:', error);
      throw error;
    }
  }

  // Biyografiyi güncelle
  async updateBiography(farmerId: string, farmer_biografi: string) {
    try {
      this.logger.debug(`Biyografi güncelleniyor. Farmer ID: ${farmerId}`);
      console.log('=== Biography Update Debug ===');
      console.log('Farmer ID:', farmerId);
      console.log('New Biography:', farmer_biografi);

      // Önce farmer kaydının var olup olmadığını kontrol et
      const { data: existingFarmer, error: fetchError } = await this.supabaseService.getServiceClient()
        .from('farmer')
        .select('farmer_id, farmer_biografi')
        .eq('farmer_id', farmerId)
        .single();

      console.log('Existing farmer data:', existingFarmer);
      console.log('Fetch error:', fetchError);

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Farmer bilgisi alınamadı: ${fetchError.message}`);
      }

      let result;
      
      if (!existingFarmer) {
        // Farmer kaydı yoksa hata ver (bu durumda olmayacak ama güvenlik için)
        throw new Error('Farmer kaydı bulunamadı');
      } else {
        // Farmer kaydı var, biyografiyi update et
        console.log('Updating existing farmer biography...');
        
        const { data, error } = await this.supabaseService.getServiceClient()
          .from('farmer')
          .update({ farmer_biografi })
          .eq('farmer_id', farmerId)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw new Error(`Biyografi güncellenemedi: ${error.message}`);
        }

        console.log('Biography updated successfully:', data);
        result = data[0];
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Biography update error:', error);
      this.logger.error('Biyografi güncelleme hatası:', error);
      throw error;
    }
  }

  // Alternatif biyografi güncelleme metodu (upsert)
  async updateBiographyUpsert(farmerId: string, farmer_biografi: string) {
    try {
      this.logger.debug(`Biyografi upsert. Farmer ID: ${farmerId}`);
      console.log('=== Biography Upsert Debug ===');
      console.log('Farmer ID:', farmerId);
      console.log('New Biography:', farmer_biografi);

      // Upsert kullanarak biyografiyi güncelle
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('farmer')
        .upsert({ 
          farmer_id: farmerId, 
          farmer_biografi 
        })
        .eq('farmer_id', farmerId)
        .select();

      console.log('Upsert result:', { data, error });

      if (error) {
        throw new Error(`Biyografi upsert hatası: ${error.message}`);
      }

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Biography upsert error:', error);
      this.logger.error('Biyografi upsert hatası:', error);
      throw error;
    }
  }

  // Çiftlik resimleri yükle
  async uploadFarmImages(farmerId: string, images: Express.Multer.File[]) {
    try {
      this.logger.debug(`Çiftlik resimleri yükleniyor. Farmer ID: ${farmerId}, Resim sayısı: ${images.length}`);

      const bucketName = 'farmer-images';
      const uploadedImages = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        console.log(`=== Service Upload Image ${i} Debug ===`);
        console.log('Image details:', {
          originalname: image.originalname,
          mimetype: image.mimetype,
          size: image.size,
          buffer_length: image.buffer?.length,
          has_buffer: !!image.buffer
        });

        if (!image.buffer || image.buffer.length === 0) {
          throw new Error(`Resim ${i + 1} buffer'ı boş veya eksik`);
        }

        const fileExt = image.originalname.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${farmerId}/${fileName}`;

        console.log('Upload path:', filePath);
        console.log('Buffer first 10 bytes:', image.buffer.slice(0, 10));

        // Storage'a yükle
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, image.buffer, {
            contentType: image.mimetype,
            upsert: true,
          });

        console.log('Upload result:', { uploadData, uploadError });

        if (uploadError) {
          this.logger.error(`Resim yükleme hatası (${filePath}):`, uploadError);
          throw new Error(`Resim yüklenirken hata oluştu: ${uploadError.message}`);
        }

        // 50 yıllık imzalı URL oluştur
        const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .createSignedUrl(filePath, 1576800000); // 50 yıl

        if (signedUrlError) {
          this.logger.error(`İmzalı URL oluşturma hatası (${filePath}):`, signedUrlError);
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw new Error(`İmzalı URL oluşturulurken hata oluştu: ${signedUrlError.message}`);
        }

        // Veritabanına kaydet
        const { data: dbData, error: dbError } = await this.supabaseService.getServiceClient()
          .from('farmer_images')
          .insert({
            farmer_id: farmerId,
            farmer_image: signedUrlData.signedUrl
          })
          .select()
          .single();

        if (dbError) {
          this.logger.error(`Veritabanı kayıt hatası:`, dbError);
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw new Error(`Veritabanı kayıt hatası: ${dbError.message}`);
        }

        uploadedImages.push(dbData);
      }

      return { success: true, data: uploadedImages };
    } catch (error) {
      this.logger.error('Çiftlik resimleri yükleme hatası:', error);
      throw error;
    }
  }

  // Çiftlik sertifikaları yükle
  async uploadFarmCertificates(farmerId: string, certificates: Express.Multer.File[]) {
    try {
      this.logger.debug(`Çiftlik sertifikaları yükleniyor. Farmer ID: ${farmerId}, Sertifika sayısı: ${certificates.length}`);

      const bucketName = 'farmer-documents';
      const uploadedCertificates = [];

      for (let i = 0; i < certificates.length; i++) {
        const cert = certificates[i];
        
        console.log(`=== Service Upload Certificate ${i} Debug ===`);
        console.log('Certificate details:', {
          originalname: cert.originalname,
          mimetype: cert.mimetype,
          size: cert.size,
          buffer_length: cert.buffer?.length,
          has_buffer: !!cert.buffer
        });

        if (!cert.buffer || cert.buffer.length === 0) {
          throw new Error(`Sertifika ${i + 1} buffer'ı boş veya eksik`);
        }

        const fileExt = cert.originalname.split('.').pop();
        const fileName = `sertifika-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${farmerId}/${fileName}`;

        console.log('Upload path:', filePath);
        console.log('Buffer first 10 bytes:', cert.buffer.slice(0, 10));

        // Storage'a yükle
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, cert.buffer, {
            contentType: cert.mimetype,
            upsert: true,
          });

        console.log('Upload result:', { uploadData, uploadError });

        if (uploadError) {
          this.logger.error(`Sertifika yükleme hatası (${filePath}):`, uploadError);
          throw new Error(`Sertifika yüklenirken hata oluştu: ${uploadError.message}`);
        }

        // 50 yıllık imzalı URL oluştur
        const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .createSignedUrl(filePath, 1576800000); // 50 yıl

        if (signedUrlError) {
          this.logger.error(`İmzalı URL oluşturma hatası (${filePath}):`, signedUrlError);
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw new Error(`İmzalı URL oluşturulurken hata oluştu: ${signedUrlError.message}`);
        }

        // Veritabanına kaydet
        const { data: dbData, error: dbError } = await this.supabaseService.getServiceClient()
          .from('farmer_certificate')
          .insert({
            farmer_id: farmerId,
            images: signedUrlData.signedUrl
          })
          .select()
          .single();

        if (dbError) {
          this.logger.error(`Veritabanı kayıt hatası:`, dbError);
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw new Error(`Veritabanı kayıt hatası: ${dbError.message}`);
        }

        uploadedCertificates.push(dbData);
      }

      return { success: true, data: uploadedCertificates };
    } catch (error) {
      this.logger.error('Çiftlik sertifikaları yükleme hatası:', error);
      throw error;
    }
  }

  // Çiftlik resimlerini getir
  async getFarmImages(farmerId: string) {
    try {
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('farmer_images')
        .select('*')
        .eq('farmer_id', farmerId);

      if (error) {
        throw new Error(`Farmer resimleri alınamadı: ${error.message}`);
      }

      // Her resim için yeni imzalı URL oluştur
      const imagesWithFreshUrls = await Promise.all(
        (data || []).map(async (image) => {
          try {
            // Mevcut URL'den dosya yolunu çıkar
            const urlParts = image.farmer_image.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0];
            const filePath = `${farmerId}/${fileName}`;

            // Yeni 50 yıllık imzalı URL oluştur
            const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
              .storage
              .from('farmer-images')
              .createSignedUrl(filePath, 1576800000); // 50 yıl

            if (signedUrlError) {
              this.logger.warn(`İmzalı URL oluşturma hatası (${filePath}):`, signedUrlError);
              return image; // Hata durumunda mevcut URL'i döndür
            }

            return {
              ...image,
              farmer_image: signedUrlData.signedUrl
            };
          } catch (urlError) {
            this.logger.warn('URL yenileme hatası:', urlError);
            return image; // Hata durumunda mevcut URL'i döndür
          }
        })
      );

      return imagesWithFreshUrls;
    } catch (error) {
      this.logger.error('Çiftlik resimleri getirme hatası:', error);
      throw error;
    }
  }

  // Çiftlik sertifikalarını getir
  async getFarmCertificates(farmerId: string) {
    try {
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('farmer_certificate')
        .select('*')
        .eq('farmer_id', farmerId);

      if (error) {
        throw new Error(`Farmer sertifikaları alınamadı: ${error.message}`);
      }

      // Her sertifika için yeni imzalı URL oluştur
      const certificatesWithFreshUrls = await Promise.all(
        (data || []).map(async (certificate) => {
          try {
            // Mevcut URL'den dosya yolunu çıkar
            const urlParts = certificate.images.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0];
            const filePath = `${farmerId}/${fileName}`;

            // Yeni 50 yıllık imzalı URL oluştur
            const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
              .storage
              .from('farmer-documents')
              .createSignedUrl(filePath, 1576800000); // 50 yıl

            if (signedUrlError) {
              this.logger.warn(`İmzalı URL oluşturma hatası (${filePath}):`, signedUrlError);
              return certificate; // Hata durumunda mevcut URL'i döndür
            }

            return {
              ...certificate,
              images: signedUrlData.signedUrl
            };
          } catch (urlError) {
            this.logger.warn('URL yenileme hatası:', urlError);
            return certificate; // Hata durumunda mevcut URL'i döndür
          }
        })
      );

      return certificatesWithFreshUrls;
    } catch (error) {
      this.logger.error('Çiftlik sertifikaları getirme hatası:', error);
      throw error;
    }
  }

  // Çiftlik resmi sil
  async deleteFarmImage(farmerId: string, imageId: string) {
    try {
      // Önce resim bilgisini al
      const { data: imageData, error: getError } = await this.supabaseService.getServiceClient()
        .from('farmer_images')
        .select('*')
        .eq('id', imageId)
        .eq('farmer_id', farmerId)
        .single();

      if (getError || !imageData) {
        throw new Error('Resim bulunamadı veya yetkisiz erişim');
      }

      // Storage'dan sil
      try {
        const imageUrl = imageData.farmer_image;
        // URL'den dosya yolunu çıkar
        const urlParts = imageUrl.split('/');
        const bucketPath = urlParts[urlParts.length - 1].split('?')[0];
        const filePath = `${farmerId}/${bucketPath}`;

        await this.supabaseService.getServiceClient()
          .storage
          .from('farmer-images')
          .remove([filePath]);
      } catch (storageError) {
        this.logger.warn('Storage silme hatası (devam ediliyor):', storageError);
      }

      // Veritabanından sil
      const { error: deleteError } = await this.supabaseService.getServiceClient()
        .from('farmer_images')
        .delete()
        .eq('id', imageId)
        .eq('farmer_id', farmerId);

      if (deleteError) {
        throw new Error(`Resim silinemedi: ${deleteError.message}`);
      }

      return { success: true, message: 'Resim başarıyla silindi' };
    } catch (error) {
      this.logger.error('Çiftlik resmi silme hatası:', error);
      throw error;
    }
  }

  // Çiftlik sertifikası sil
  async deleteFarmCertificate(farmerId: string, certificateId: string) {
    try {
      // Önce sertifika bilgisini al
      const { data: certData, error: getError } = await this.supabaseService.getServiceClient()
        .from('farmer_certificate')
        .select('*')
        .eq('id', certificateId)
        .eq('farmer_id', farmerId)
        .single();

      if (getError || !certData) {
        throw new Error('Sertifika bulunamadı veya yetkisiz erişim');
      }

      // Storage'dan sil
      try {
        const certUrl = certData.images;
        // URL'den dosya yolunu çıkar
        const urlParts = certUrl.split('/');
        const bucketPath = urlParts[urlParts.length - 1].split('?')[0];
        const filePath = `${farmerId}/${bucketPath}`;

        await this.supabaseService.getServiceClient()
          .storage
          .from('farmer-documents')
          .remove([filePath]);
      } catch (storageError) {
        this.logger.warn('Storage silme hatası (devam ediliyor):', storageError);
      }

      // Veritabanından sil
      const { error: deleteError } = await this.supabaseService.getServiceClient()
        .from('farmer_certificate')
        .delete()
        .eq('id', certificateId)
        .eq('farmer_id', farmerId);

      if (deleteError) {
        throw new Error(`Sertifika silinemedi: ${deleteError.message}`);
      }

      return { success: true, message: 'Sertifika başarıyla silindi' };
    } catch (error) {
      this.logger.error('Çiftlik sertifikası silme hatası:', error);
      throw error;
    }
  }

  // Auth ID güncelleme metodu
  async updateFarmerAuthId(farmerId: string, authId: string) {
    console.log('=== Update Farmer Auth ID Service ===');
    console.log('Farmer ID:', farmerId);
    console.log('Auth ID:', authId);

    const { data, error } = await this.supabaseService.getServiceClient()
      .from('farmer')
      .update({ auth_id: authId })
      .eq('farmer_id', farmerId)
      .select()
      .single();

    if (error) {
      console.error('Auth ID güncelleme hatası:', error);
      throw new Error(`Auth ID güncellenirken hata oluştu: ${error.message}`);
    }

    console.log('Auth ID başarıyla güncellendi');
    return data;
  }
}