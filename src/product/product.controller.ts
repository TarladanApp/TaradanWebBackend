import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { RequestWithUser } from '../auth/interfaces/request.interface';

// Ürün veri transfer objesi (basit hali)
class UpdateProductDto {
  product_katalog_name?: string;
  farmer_price?: number;
  product_name?: string;
  stock_quantity?: number;
  // product_image?: string;
}

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto, @Req() req: RequestWithUser) {
    const farmerId = req.user.id;
    return this.productService.createProduct(createProductDto, farmerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadProductImage(
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    const farmerId = req.user.id;
    return this.productService.uploadProductImage(productId, file, farmerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/farmer/:farmerId')
  async findAllByFarmer(@Param('farmerId') farmerId: string) {
    return this.productService.getProductsByFarmerId(farmerId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':productId')
  async update(
    @Param('productId') productId: string,
    @Body() updateProductDto: Partial<CreateProductDto>,
    @Req() req: RequestWithUser,
  ) {
    const farmerId = req.user.id;
    return this.productService.updateProduct(productId, updateProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':productId')
  async delete(
    @Param('productId') productId: string,
    @Req() req: RequestWithUser,
  ) {
    const farmerId = req.user.id;
    return this.productService.deleteProduct(productId);
  }
} 