import { Controller, Post, Get, Put, Delete, Body, Param, HttpException, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FarmerService } from './farmer.service';
import { CreateFarmerDto, LoginFarmerDto } from './dto/create-farmer.dto';

@ApiTags('farmer')
@Controller('farmer')
export class FarmerController {
  constructor(private readonly farmerService: FarmerService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni çiftçi oluştur' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Çiftçi başarıyla oluşturuldu.' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri.' })
  @UseInterceptors(FileInterceptor('farmer_certificates'))
  async createFarmer(
    @Body() farmerData: CreateFarmerDto,
    @UploadedFile() farmer_certificates_file?: Express.Multer.File
  ) {
    try {
      if (farmer_certificates_file) {
        // Dosya boyutu kontrolü
        if (farmer_certificates_file.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        }

        // Dosya tipi kontrolü
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedMimeTypes.includes(farmer_certificates_file.mimetype)) {
          throw new BadRequestException('Sadece JPEG, PNG ve PDF formatları desteklenmektedir.');
        }
      }

      console.log('Gelen Farmer Data (Backend Controller):', farmerData);
      console.log('Gelen Sertifika Dosyası (Backend Controller):', farmer_certificates_file);
      
      return await this.farmerService.createFarmer(farmerData, farmer_certificates_file);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Çiftçi oluşturulurken bir hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get(':id')
  async getFarmer(@Param('id') id: string) {
    return await this.farmerService.getFarmerById(id);
  }

  @Put(':id')
  async updateFarmer(@Param('id') id: string, @Body() farmerData: CreateFarmerDto) {
    return await this.farmerService.updateFarmer(id, farmerData);
  }

  @Delete(':id')
  async deleteFarmer(@Param('id') id: string) {
    return await this.farmerService.deleteFarmer(id);
  }

  @Post('login')
  @ApiOperation({ summary: 'Çiftçi girişi yap' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı.' })
  @ApiResponse({ status: 401, description: 'Yetkisiz giriş.' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri.' })
  async loginFarmer(@Body() loginData: LoginFarmerDto) {
    try {
      return await this.farmerService.loginFarmer(loginData);
    } catch (error) {
      throw new HttpException(
        error.message || 'Giriş yapılırken bir hata oluştu',
        HttpStatus.UNAUTHORIZED
      );
    }
  }
}