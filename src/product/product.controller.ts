import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
@UseGuards(JwtAuthGuard) // JWT guard'ı etkinleştir
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
      // Giriş yapan farmer'ın ID'sini kullan
      const farmerId = req.user.farmerId.toString();
      const result = await this.productService.create(productData, farmerId, file);
      console.log('Service result:', result);
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw error;
    }
  }

  @Get('debug/table-test')
  async testTableStructure(@Request() req) {
    console.log('=== Testing Table Structure ===');
    const farmerId = req.user.farmerId.toString();
    console.log('Farmer ID:', farmerId);
    
    try {
      // Basit bir select sorgusu ile tablo yapısını test et
      const result = await this.productService.testTableStructure(farmerId);
      return result;
    } catch (error) {
      console.error('Table structure test error:', error);
      return { error: error.message, details: error };
    }
  }

  @Get()
  async findAllByFarmer(@Request() req) {
    console.log('User from request:', req.user); // Debug için
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
    
    // Giriş yapan farmer'ın ID'sini kullan
    const farmerId = req.user.farmerId.toString();
    console.log('Using farmer ID:', farmerId);
    
    try {
      const result = await this.productService.update(id, productData, farmerId, file);
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
    
    // Giriş yapan farmer'ın ID'sini kullan
    const farmerId = req.user.farmerId.toString();
    console.log('Using farmer ID:', farmerId);
    
    try {
      const result = await this.productService.remove(id, farmerId);
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