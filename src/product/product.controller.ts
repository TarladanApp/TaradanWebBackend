import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
// @UseGuards(JwtAuthGuard) // Geçici olarak devre dışı
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    console.log('=== Product Create Debug ===');
    console.log('Raw Body:', req.body);
    console.log('CreateProductDto:', createProductDto);
    console.log('File:', file);
    console.log('User from request:', req.user);
    
    // String'den number'a dönüştürme
    const productData = {
      ...createProductDto,
      farmer_price: Number(createProductDto.farmer_price),
      stock_quantity: Number(createProductDto.stock_quantity),
    };
    
    console.log('ProductData after conversion:', productData);
    console.log('farmer_price type:', typeof productData.farmer_price);
    console.log('stock_quantity type:', typeof productData.stock_quantity);
    
    try {
      // Geçici farmer_id
      const result = await this.productService.create(productData, '46', file);
      console.log('Service result:', result);
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw error;
    }
  }

  @Get()
  async findAllByFarmer(@Request() req) {
    console.log('User from request:', req.user); // Debug için
    // Geçici farmer_id
    return this.productService.findAllByFarmer('46');
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
    console.log('=== Product Controller Update Debug ===');
    console.log('Product ID:', id);
    console.log('User from request:', req.user);
    console.log('UpdateProductDto:', updateProductDto);
    
    // String'den number'a dönüştürme
    const productData = {
      ...updateProductDto,
      farmer_price: updateProductDto.farmer_price ? Number(updateProductDto.farmer_price) : undefined,
      stock_quantity: updateProductDto.stock_quantity ? Number(updateProductDto.stock_quantity) : undefined,
    };
    
    // Farmer ID'yi number olarak geç
    const farmerId = 46;
    console.log('Using farmer ID:', farmerId);
    
    try {
      const result = await this.productService.update(id, productData, farmerId.toString(), file);
      console.log('Update successful:', result);
      return result;
    } catch (error) {
      console.error('Update error in controller:', error);
      
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

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    console.log('=== Product Controller Delete Debug ===');
    console.log('Product ID:', id);
    console.log('User from request:', req.user);
    
    // Farmer ID'yi number olarak geç
    const farmerId = 46;
    console.log('Using farmer ID:', farmerId);
    
    try {
      const result = await this.productService.remove(id, farmerId.toString());
      console.log('Delete successful:', result);
      return result;
    } catch (error) {
      console.error('Delete error in controller:', error);
      
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