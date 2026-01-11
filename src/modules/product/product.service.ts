import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly supabaseService: SupabaseService) { }

  async create(createProductDto: CreateProductDto, farmerId: string, image?: Express.Multer.File) {
    this.logger.log('Creating product...');
    this.logger.debug({
      message: 'Image received',
      originalname: image?.originalname,
      mimetype: image?.mimetype,
      size: image?.size,
      buffer_length: image?.buffer?.length
    });

    // Önce ürünü veritabanına ekleyelim
    const insertData = {
      farmer_id: farmerId,
      product_name: createProductDto.product_name,
      product_katalog_name: createProductDto.product_katalog_name,
      farmer_price: createProductDto.farmer_price,
      stock_quantity: createProductDto.stock_quantity,
      image_url: '', // null yerine boş string kullan
      tarladan_commission: 5, // Varsayılan komisyon oranı
      tarladan_price: Number(createProductDto.farmer_price) * 1.05, // Komisyon dahil fiyat
    };

    this.logger.debug({ message: 'Insert data', insertData });

    const { data: productData, error: productError } = await this.supabaseService.getServiceClient()
      .from('products')
      .insert([insertData])
      .select()
      .single();

    if (productError) {
      this.logger.error('Supabase insert error details:', productError);
      throw productError;
    }

    let imageUrl = '';
    const productId = productData.id;
    this.logger.log(`Product created with ID: ${productId}`);

    // Eğer resim yüklendiyse, storage'a yükle ve imzalı URL oluştur
    if (image && productId) {
      try {
        this.logger.debug({
          message: 'Image details',
          originalname: image.originalname,
          mimetype: image.mimetype,
          size: image.size,
          buffer_length: image.buffer?.length
        });

        // Buffer kontrolü
        if (!image.buffer || image.buffer.length === 0) {
          throw new Error('Resim buffer\'ı boş veya eksik');
        }

        // MIME type kontrolü
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(image.mimetype)) {
          throw new Error(`Desteklenmeyen resim formatı: ${image.mimetype}. Desteklenen formatlar: ${allowedMimeTypes.join(', ')}`);
        }

        // Dosya boyutu kontrolü (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (image.size > maxSize) {
          throw new Error(`Resim boyutu çok büyük: ${(image.size / 1024 / 1024).toFixed(2)}MB. Maksimum 5MB olmalı.`);
        }

        const bucketName = 'product-images';

        // Dosya uzantısını MIME type'a göre belirle
        let fileExt = 'jpg';
        switch (image.mimetype) {
          case 'image/png':
            fileExt = 'png';
            break;
          case 'image/jpeg':
          case 'image/jpg':
            fileExt = 'jpg';
            break;
          case 'image/gif':
            fileExt = 'gif';
            break;
          case 'image/webp':
            fileExt = 'webp';
            break;
          default:
            fileExt = 'jpg';
        }

        const filePath = `${productId}.${fileExt}`; // Ürün ID'si ile kaydet

        this.logger.log(`Uploading to storage: ${bucketName}/${filePath}`);

        // Service role client ile dosya yükleme
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, image.buffer, {
            contentType: image.mimetype,
            upsert: true,
            duplex: 'half'
          });

        if (uploadError) {
          this.logger.error('Upload error:', uploadError);
          throw new Error(`Resim yüklenirken hata oluştu: ${uploadError.message}`);
        }

        this.logger.log('Upload successful');

        // Public URL oluştur
        const { data: publicUrlData } = this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
        this.logger.log(`Public URL created: ${imageUrl}`);

        // Ürünün image_url'ini güncelle
        const { data: updatedData, error: updateError } = await this.supabaseService.getServiceClient()
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', productId)
          .select()
          .single();

        if (updateError) {
          this.logger.error('Database update error:', updateError);
          // Hata durumunda yüklenen dosyayı temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw updateError;
        }

        this.logger.log('Product updated with image URL');
        return updatedData;
      } catch (error) {
        this.logger.error('Resim yükleme hatası:', error);
        // Resim yükleme başarısızsa bile ürün oluşturulmuş olacak
        return productData;
      }
    }

    this.logger.log('No image provided, returning product without image');
    return productData;
  }

  async findAllByFarmer(farmerId: string) {
    this.logger.log(`Finding products for farmer: ${farmerId}`);

    try {
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('products')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });



      if (error) {
        this.logger.error('Supabase error:', error);
        throw error;
      }

      this.logger.log(`Found products count: ${data?.length || 0}`);
      return data || [];
    } catch (error) {
      this.logger.error('findAllByFarmer error:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    this.logger.debug(`Product findOne: ${id}`);

    try {
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      this.logger.debug({ message: 'Supabase query result', data, error });

      if (error) {
        this.logger.error('Supabase error:', error);
        throw error;
      }
      if (!data) {
        this.logger.warn(`Product not found: ${id}`);
        throw new NotFoundException('Ürün bulunamadı');
      }

      this.logger.debug({ message: 'Product found', data });
      return data;
    } catch (error) {
      this.logger.error('findOne error:', error);
      throw error;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, farmerId: string, image?: Express.Multer.File) {
    this.logger.log(`Updating product: ${id} by farmer: ${farmerId}`);

    const product = await this.findOne(id);


    // String ve number karşılaştırması için == kullan
    if (product.farmer_id != farmerId) {
      this.logger.warn(`Access denied for farmer ${farmerId} on product ${id}`);
      throw new Error('Bu ürünü düzenleme yetkiniz yok');
    }

    this.logger.log('Access granted - updating product');
    let imageUrl = product.image_url;

    // Eğer yeni resim yüklendiyse
    if (image) {
      try {
        this.logger.debug({
          message: 'Update Image details',
          originalname: image.originalname,
          mimetype: image.mimetype,
          size: image.size,
          buffer_length: image.buffer?.length
        });

        // Buffer kontrolü
        if (!image.buffer || image.buffer.length === 0) {
          throw new Error('Resim buffer\'ı boş veya eksik');
        }

        // MIME type kontrolü
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(image.mimetype)) {
          throw new Error(`Desteklenmeyen resim formatı: ${image.mimetype}`);
        }

        // Dosya boyutu kontrolü (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (image.size > maxSize) {
          throw new Error(`Resim boyutu çok büyük: ${(image.size / 1024 / 1024).toFixed(2)}MB`);
        }

        const bucketName = 'product-images';

        // Dosya uzantısını MIME type'a göre belirle
        let fileExt = 'jpg';
        switch (image.mimetype) {
          case 'image/png':
            fileExt = 'png';
            break;
          case 'image/jpeg':
          case 'image/jpg':
            fileExt = 'jpg';
            break;
          case 'image/gif':
            fileExt = 'gif';
            break;
          case 'image/webp':
            fileExt = 'webp';
            break;
          default:
            fileExt = 'jpg';
        }

        const filePath = `${id}.${fileExt}`; // Ürün ID'si ile kaydet

        this.logger.log(`Update uploading: ${bucketName}/${filePath}`);

        // Service role client ile dosya yükleme
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, image.buffer, {
            contentType: image.mimetype,
            upsert: true, // Eski dosyayı üzerine yaz
            duplex: 'half'
          });

        if (uploadError) {
          throw new Error(`Resim yüklenirken hata oluştu: ${uploadError.message}`);
        }

        // Public URL oluştur
        const { data: publicUrlData } = this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      } catch (error) {
        this.logger.error('Resim güncelleme hatası:', error);
        // Resim güncelleme başarısızsa eski URL'i kullan
      }
    }

    const { data, error } = await this.supabaseService.getServiceClient()
      .from('products')
      .update({
        product_name: updateProductDto.product_name,
        product_katalog_name: updateProductDto.product_katalog_name,
        farmer_price: updateProductDto.farmer_price,
        stock_quantity: updateProductDto.stock_quantity,
        image_url: imageUrl,
        tarladan_price: Number(updateProductDto.farmer_price) * 1.05, // Komisyon oranını düzelttim
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string, farmerId: string) {
    this.logger.log(`Removing product: ${id} by farmer: ${farmerId}`);

    try {
      const product = await this.findOne(id);

      // String ve number karşılaştırması için == kullan
      if (product.farmer_id != farmerId) {
        this.logger.warn(`Access denied for farmer ${farmerId} on product ${id}`);
        throw new Error('Bu ürünü silme yetkiniz yok');
      }

      this.logger.log('Access granted - deleting product');

      // Önce storage'dan resmi sil (eğer varsa)
      if (product.image_url) {
        try {
          const bucketName = 'product-images';
          this.logger.log('Attempting to delete image from storage...');

          // Storage'daki dosyaları listele ve product ID ile eşleşeni bul
          const { data: files, error: listError } = await this.supabaseService.getServiceClient()
            .storage
            .from(bucketName)
            .list('', {
              limit: 1000,
              search: id
            });

          if (listError) {
            this.logger.error('Error listing files:', listError);
          } else if (files && files.length > 0) {
            // Product ID ile başlayan dosyaları bul ve sil
            const filesToDelete = files
              .filter(file => file.name.startsWith(id))
              .map(file => file.name);

            if (filesToDelete.length > 0) {
              this.logger.log(`Files to delete: ${filesToDelete.join(', ')}`);

              const { error: deleteError } = await this.supabaseService.getServiceClient()
                .storage
                .from(bucketName)
                .remove(filesToDelete);

              if (deleteError) {
                this.logger.error('Error deleting files from storage:', deleteError);
                // Storage silme hatası olursa devam et, sadece logla
              } else {
                this.logger.log('Image files deleted successfully from storage');
              }
            } else {
              this.logger.log(`No files found to delete for product ID: ${id}`);
            }
          }
        } catch (storageError) {
          this.logger.error('Storage deletion error:', storageError);
          // Storage hatası durumunda devam et
        }
      }

      // Sonra veritabanından ürünü sil
      const { error } = await this.supabaseService.getServiceClient()
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Delete error from Supabase:', error);
        throw new Error(`Supabase delete error: ${error.message}`);
      }

      this.logger.log('Product deleted successfully');
      return { message: 'Ürün başarıyla silindi' };
    } catch (error) {
      this.logger.error('Remove method error:', error);
      throw error;
    }
  }

  async testTableStructure(farmerId: string) {
    this.logger.log(`Testing Table Structure for farmer: ${farmerId}`);

    try {
      // Önce mevcut ürünleri listele
      const { data: existingProducts, error: selectError } = await this.supabaseService.getServiceClient()
        .from('products')
        .select('*')
        .eq('farmer_id', farmerId)
        .limit(1);

      this.logger.debug({ message: 'Existing products query result', existingProducts, selectError });

      // Basit bir insert testi yap (sadece gerekli alanlarla)
      const testData = {
        farmer_id: farmerId,
        product_name: 'TEST_PRODUCT_DELETE_ME',
        product_katalog_name: 'test',
        farmer_price: 1,
        stock_quantity: 1,
        tarladan_commission: 5,
        tarladan_price: 1.05,
      };

      this.logger.debug({ message: 'Test insert data', testData });

      const { data: insertResult, error: insertError } = await this.supabaseService.getServiceClient()
        .from('products')
        .insert([testData])
        .select()
        .single();

      this.logger.debug({ message: 'Test insert result', insertResult, insertError });

      // Eğer başarılı olduysa test ürünü sil
      if (insertResult && !insertError) {
        const { error: deleteError } = await this.supabaseService.getServiceClient()
          .from('products')
          .delete()
          .eq('id', insertResult.id);

        this.logger.debug({ message: 'Test product cleanup', deleteError });
      }

      return {
        existingProducts,
        selectError,
        testInsert: { insertResult, insertError },
        message: 'Table structure test completed'
      };
    } catch (error) {
      this.logger.error('Table structure test error:', error);
      throw error;
    }
  }
} 