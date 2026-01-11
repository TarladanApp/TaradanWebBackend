import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, UseInterceptors, Request, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
@UseGuards(JwtAuthGuard) // JWT guard'ı etkinleştir
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    this.logger.log('Product Create request received');
    this.logger.debug({
      message: 'Create Product Debug',
      rawBody: req.body,
      dto: createProductDto,
      file: {
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        size: file?.size,
        buffer_exists: !!file?.buffer,
        buffer_length: file?.buffer?.length
      },
      user: req.user
    });

    // Dosya kontrolü
    if (file) {
      // Buffer kontrolü
      if (!file.buffer || file.buffer.length === 0) {
        return {
          statusCode: 400,
          message: 'Resim dosyası bozuk veya boş',
          error: 'Bad Request'
        };
      }

      // MIME type kontrolü
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return {
          statusCode: 400,
          message: `Desteklenmeyen resim formatı: ${file.mimetype}. Desteklenen formatlar: ${allowedMimeTypes.join(', ')}`,
          error: 'Bad Request'
        };
      }

      // Dosya boyutu kontrolü (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          statusCode: 400,
          message: `Resim boyutu çok büyük: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maksimum 5MB olmalı.`,
          error: 'Bad Request'
        };
      }
    }

    // String'den number'a dönüştürme
    const productData = {
      ...createProductDto,
      farmer_price: Number(createProductDto.farmer_price),
      stock_quantity: Number(createProductDto.stock_quantity),
    };

    this.logger.debug({
      message: 'ProductData prepared',
      productData,
      farmer_price_type: typeof productData.farmer_price,
      stock_quantity_type: typeof productData.stock_quantity
    });

    try {
      // Giriş yapan farmer'ın ID'sini kullan
      const farmerId = req.user.farmerId.toString();
      const result = await this.productService.create(productData, farmerId, file);
      this.logger.debug({ message: 'Service result', result });
      return result;
    } catch (error) {
      this.logger.error('Service error:', error);
      throw error;
    }
  }

  @Get('debug/table-test')
  async testTableStructure(@Request() req) {
    this.logger.log('Testing table structure via Debug endpoint');
    const farmerId = req.user.farmerId.toString();
    this.logger.debug(`Farmer ID: ${farmerId}`);

    try {
      // Basit bir select sorgusu ile tablo yapısını test et
      const result = await this.productService.testTableStructure(farmerId);
      return result;
    } catch (error) {
      this.logger.error('Table structure test error:', error);
      return { error: error.message, details: error };
    }
  }

  @Get()
  async findAllByFarmer(@Request() req) {
    this.logger.debug({ message: 'User from request', user: req.user });
    // Giriş yapan farmer'ın ürünlerini getir
    const farmerId = req.user.farmerId.toString();
    return this.productService.findAllByFarmer(farmerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    this.logger.log(`Product Update request for ID: ${id}`);
    this.logger.debug({
      message: 'Update Product Debug',
      user: req.user,
      dto: updateProductDto
    });

    // String'den number'a dönüştürme
    const productData = {
      ...updateProductDto,
      farmer_price: updateProductDto.farmer_price ? Number(updateProductDto.farmer_price) : undefined,
      stock_quantity: updateProductDto.stock_quantity ? Number(updateProductDto.stock_quantity) : undefined,
    };

    // Giriş yapan farmer'ın ID'sini kullan
    const farmerId = req.user.farmerId.toString();
    this.logger.debug(`Using farmer ID: ${farmerId}`);

    try {
      const result = await this.productService.update(id, productData, farmerId, file);
      this.logger.debug({ message: 'Update successful', result });
      return result;
    } catch (error) {
      this.logger.error('Update error in controller:', error);

      // Hata türüne göre response döndür
      if (error.message === 'Bu ürünü düzenleme yetkiniz yok') {
        return { statusCode: 403, message: error.message };
      } else if (error.message === 'Ürün bulunamadı') {
        return { statusCode: 404, message: error.message };
      } else {
        return { statusCode: 500, message: 'Ürün güncellenirken hata oluştu', error: error.message };
      }
    }
  }

  @Get('test/images')
  async testImages(@Request() req) {
    this.logger.debug('Testing product images');
    const farmerId = req.user.farmerId.toString();
    this.logger.debug(`Farmer ID: ${farmerId}`);

    try {
      const products = await this.productService.findAllByFarmer(farmerId);

      const imageTestResults = await Promise.all(
        products.map(async (product) => {
          this.logger.verbose(`Testing product image: ${product.id} -> ${product.image_url}`);

          if (!product.image_url) {
            return {
              productId: product.id,
              productName: product.product_name,
              hasImageUrl: false,
              imageUrl: null,
              error: 'No image URL'
            };
          }

          try {
            // URL'in erişilebilir olup olmadığını test et
            const response = await fetch(product.image_url, { method: 'HEAD' });
            return {
              productId: product.id,
              productName: product.product_name,
              hasImageUrl: true,
              imageUrl: product.image_url,
              accessible: response.ok,
              status: response.status
            };
          } catch (fetchError) {
            return {
              productId: product.id,
              productName: product.product_name,
              hasImageUrl: true,
              imageUrl: product.image_url,
              accessible: false,
              error: fetchError.message
            };
          }
        })
      );

      return {
        farmerProductCount: products.length,
        imageTests: imageTestResults
      };
    } catch (error) {
      this.logger.error('Image test error:', error);
      return { error: error.message };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    this.logger.log(`Product Delete request for ID: ${id}`);
    this.logger.debug({
      message: 'Delete Product Debug',
      user: req.user
    });

    // Giriş yapan farmer'ın ID'sini kullan
    const farmerId = req.user.farmerId.toString();
    this.logger.debug(`Using farmer ID: ${farmerId}`);

    try {
      const result = await this.productService.remove(id, farmerId);
      this.logger.debug({ message: 'Delete successful', result });
      return result;
    } catch (error) {
      this.logger.error('Delete error in controller:', error);

      // Hata türüne göre response döndür
      if (error.message === 'Bu ürünü silme yetkiniz yok') {
        return { statusCode: 403, message: error.message };
      } else if (error.message === 'Ürün bulunamadı') {
        return { statusCode: 404, message: error.message };
      } else {
        return { statusCode: 500, message: 'Ürün silinirken hata oluştu', error: error.message };
      }
    }
  }
} 