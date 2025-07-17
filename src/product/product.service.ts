import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createProductDto: CreateProductDto, farmerId: string, image?: Express.Multer.File) {
    console.log('=== Product Service Create Debug ===');
    console.log('Image received:', {
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
    
    console.log('Insert data:', insertData);
    
    const { data: productData, error: productError } = await this.supabaseService.getServiceClient()
      .from('products')
      .insert([insertData])
      .select()
      .single();

    console.log('Supabase insert result:', { productData, productError });
    if (productError) {
      console.error('Supabase insert error details:', productError);
      throw productError;
    }

    let imageUrl = '';
    const productId = productData.id;
    console.log('Product created with ID:', productId);

    // Eğer resim yüklendiyse, storage'a yükle ve imzalı URL oluştur
    if (image && productId) {
      try {
        const bucketName = 'product-images';
        const fileExt = image.originalname.split('.').pop();
        const filePath = `${productId}.${fileExt}`; // Ürün ID'si ile kaydet
        
        console.log('Uploading to storage:', {
          bucketName,
          filePath,
          fileSize: image.buffer.length,
          contentType: image.mimetype
        });

        // Service role client ile dosya yükleme
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, image.buffer, {
            contentType: image.mimetype,
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Resim yüklenirken hata oluştu: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // 50 yıllık imzalı URL oluştur (315360000 saniye = 10 yıl, 1576800000 = 50 yıl)
        const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .createSignedUrl(filePath, 1576800000); // 50 yıl

        if (signedUrlError) {
          console.error('Signed URL error:', signedUrlError);
          // Hata durumunda yüklenen dosyayı temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw new Error(`İmzalı URL oluşturulurken hata oluştu: ${signedUrlError.message}`);
        }

        imageUrl = signedUrlData.signedUrl;
        console.log('Signed URL created:', imageUrl);

        // Ürünün image_url'ini güncelle
        const { data: updatedData, error: updateError } = await this.supabaseService.getServiceClient()
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', productId)
          .select()
          .single();

        if (updateError) {
          console.error('Database update error:', updateError);
          // Hata durumunda yüklenen dosyayı temizle
          await this.supabaseService.getServiceClient().storage.from(bucketName).remove([filePath]);
          throw updateError;
        }

        console.log('Product updated with image URL');
        return updatedData;
      } catch (error) {
        console.error('Resim yükleme hatası:', error);
        // Resim yükleme başarısızsa bile ürün oluşturulmuş olacak
        return productData;
      }
    }

    console.log('No image provided, returning product without image');
    return productData;
  }

  async findAllByFarmer(farmerId: string) {
    console.log('=== Product Service FindAllByFarmer Debug ===');
    console.log('Farmer ID:', farmerId);
    
    try {
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('products')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      console.log('Farmer products query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Found products count:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('findAllByFarmer error:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    console.log('=== Product findOne Debug ===');
    console.log('Product ID:', id);
    
    try {
      const { data, error } = await this.supabaseService.getServiceClient()
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

      console.log('Supabase query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      if (!data) {
        console.log('Product not found');
        throw new NotFoundException('Ürün bulunamadı');
      }
      
      console.log('Product found:', data);
    return data;
    } catch (error) {
      console.error('findOne error:', error);
      throw error;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, farmerId: string, image?: Express.Multer.File) {
    console.log('=== Product Update Debug ===');
    console.log('Product ID:', id);
    console.log('Farmer ID from request:', farmerId);
    console.log('Farmer ID type:', typeof farmerId);
    
    const product = await this.findOne(id);
    console.log('Product farmer_id:', product.farmer_id);
    console.log('Product farmer_id type:', typeof product.farmer_id);
    
    // String ve number karşılaştırması için == kullan
    if (product.farmer_id != farmerId) {
      console.log('Access denied - farmer_id mismatch');
      throw new Error('Bu ürünü düzenleme yetkiniz yok');
    }

    console.log('Access granted - updating product');
    let imageUrl = product.image_url;
    
    // Eğer yeni resim yüklendiyse
    if (image) {
      try {
        const bucketName = 'product-images';
        const fileExt = image.originalname.split('.').pop();
        const filePath = `${id}.${fileExt}`; // Ürün ID'si ile kaydet

        // Service role client ile dosya yükleme
        const { data: uploadData, error: uploadError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .upload(filePath, image.buffer, {
            contentType: image.mimetype,
            upsert: true, // Eski dosyayı üzerine yaz
          });

        if (uploadError) {
          throw new Error(`Resim yüklenirken hata oluştu: ${uploadError.message}`);
        }

        // 50 yıllık imzalı URL oluştur
        const { data: signedUrlData, error: signedUrlError } = await this.supabaseService.getServiceClient()
          .storage
          .from(bucketName)
          .createSignedUrl(filePath, 1576800000); // 50 yıl

        if (signedUrlError) {
          throw new Error(`İmzalı URL oluşturulurken hata oluştu: ${signedUrlError.message}`);
        }

        imageUrl = signedUrlData.signedUrl;
      } catch (error) {
        console.error('Resim güncelleme hatası:', error);
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
    try {
      console.log('=== Product Remove Debug ===');
      console.log('Product ID:', id);
      console.log('Farmer ID from request:', farmerId);
      console.log('Farmer ID type:', typeof farmerId);
      
    const product = await this.findOne(id);
      console.log('Product farmer_id:', product.farmer_id);
      console.log('Product farmer_id type:', typeof product.farmer_id);
    
      // String ve number karşılaştırması için == kullan
      if (product.farmer_id != farmerId) {
        console.log('Access denied - farmer_id mismatch');
      throw new Error('Bu ürünü silme yetkiniz yok');
    }

      console.log('Access granted - deleting product');
      
      // Önce storage'dan resmi sil (eğer varsa)
      if (product.image_url) {
        try {
          const bucketName = 'product-images';
          console.log('Attempting to delete image from storage...');
          
          // Storage'daki dosyaları listele ve product ID ile eşleşeni bul
          const { data: files, error: listError } = await this.supabaseService.getServiceClient()
            .storage
            .from(bucketName)
            .list('', {
              limit: 1000,
              search: id
            });

          if (listError) {
            console.error('Error listing files:', listError);
          } else if (files && files.length > 0) {
            // Product ID ile başlayan dosyaları bul ve sil
            const filesToDelete = files
              .filter(file => file.name.startsWith(id))
              .map(file => file.name);
            
            if (filesToDelete.length > 0) {
              console.log('Files to delete:', filesToDelete);
              
              const { error: deleteError } = await this.supabaseService.getServiceClient()
                .storage
                .from(bucketName)
                .remove(filesToDelete);

              if (deleteError) {
                console.error('Error deleting files from storage:', deleteError);
                // Storage silme hatası olursa devam et, sadece logla
              } else {
                console.log('Image files deleted successfully from storage');
              }
            } else {
              console.log('No files found to delete for product ID:', id);
            }
          }
        } catch (storageError) {
          console.error('Storage deletion error:', storageError);
          // Storage hatası durumunda devam et
        }
      }

      // Sonra veritabanından ürünü sil
      const { error } = await this.supabaseService.getServiceClient()
      .from('products')
      .delete()
      .eq('id', id);

      if (error) {
        console.error('Delete error from Supabase:', error);
        throw new Error(`Supabase delete error: ${error.message}`);
      }
      
      console.log('Product deleted successfully');
    return { message: 'Ürün başarıyla silindi' };
    } catch (error) {
      console.error('Remove method error:', error);
      throw error;
    }
  }

  async testTableStructure(farmerId: string) {
    console.log('=== Testing Table Structure ===');
    console.log('Farmer ID:', farmerId);
    
    try {
      // Önce mevcut ürünleri listele
      const { data: existingProducts, error: selectError } = await this.supabaseService.getServiceClient()
        .from('products')
        .select('*')
        .eq('farmer_id', farmerId)
        .limit(1);

      console.log('Existing products query result:', { existingProducts, selectError });

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

      console.log('Test insert data:', testData);

      const { data: insertResult, error: insertError } = await this.supabaseService.getServiceClient()
        .from('products')
        .insert([testData])
        .select()
        .single();

      console.log('Test insert result:', { insertResult, insertError });

      // Eğer başarılı olduysa test ürünü sil
      if (insertResult && !insertError) {
        const { error: deleteError } = await this.supabaseService.getServiceClient()
          .from('products')
          .delete()
          .eq('id', insertResult.id);

        console.log('Test product cleanup:', { deleteError });
      }

      return {
        existingProducts,
        selectError,
        testInsert: { insertResult, insertError },
        message: 'Table structure test completed'
      };
    } catch (error) {
      console.error('Table structure test error:', error);
      throw error;
    }
  }
} 