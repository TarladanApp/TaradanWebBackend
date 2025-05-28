import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../common/services/supabase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  private supabase: SupabaseClient;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    private supabaseService: SupabaseService,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  async createProduct(createProductDto: CreateProductDto, farmerId: string) {
    const product = this.productRepository.create({
      ...createProductDto,
      farmer_id: farmerId,
    });

    const savedProduct = await this.productRepository.save(product);
    return savedProduct;
  }

  async uploadProductImage(productId: string, file: Express.Multer.File, farmerId: string) {
    // Ürünün var olduğunu ve çiftçiye ait olduğunu kontrol et
    const product = await this.productRepository.findOne({
      where: { id: productId, farmer_id: farmerId },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı veya bu ürünü düzenleme yetkiniz yok.');
    }

    // Dosya boyutu kontrolü
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('Dosya boyutu 5MB\'dan küçük olmalıdır.');
    }

    // Dosya tipi kontrolü
    if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece JPEG, PNG ve WebP formatları desteklenmektedir.');
    }

    try {
      // Resmi Supabase Storage'a yükle
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${productId}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('products')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw new Error('Resim yüklenirken bir hata oluştu: ' + error.message);
      }

      // Storage'dan public URL al
      const { data: { publicUrl } } = this.supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      // Ürünün image_url'ini güncelle
      product.image_url = publicUrl;
      await this.productRepository.save(product);

      return { image_url: publicUrl };
    } catch (error) {
      throw new Error('Resim yükleme işlemi başarısız oldu: ' + error.message);
    }
  }

  // Ürünleri listeleme (belirli bir çiftçiye ait ürünler)
  async getProductsByFarmerId(farmerId: string) {
    return this.productRepository.find({
      where: { farmer_id: farmerId },
    });
  }

  // Ürün güncelleme
  async updateProduct(productId: string, updateData: Partial<CreateProductDto>) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }

    Object.assign(product, updateData);
    return this.productRepository.save(product);
  }

  // Ürün silme
  async deleteProduct(productId: string) {
    const result = await this.productRepository.delete(productId);
    if (result.affected === 0) {
      throw new NotFoundException('Ürün bulunamadı.');
    }
    return { success: true };
  }
} 