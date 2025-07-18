import { Controller, Post, Get, Put, Delete, Body, Param, HttpException, HttpStatus, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FarmerService } from './farmer.service';
import { CreateFarmerDto, LoginFarmerDto } from './dto/create-farmer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  // Farmer profil bilgilerini getir
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftçinin profil bilgilerini getir' })
  async getFarmerProfile(@Req() req: any) {
    try {
      console.log('=== Farmer Profile Request ===');
      console.log('Request user:', req.user);
      
      const farmerId = req.user.farmerId;
      if (!farmerId) {
        throw new Error('Farmer ID bulunamadı');
      }
      
      return {
        farmer_name: req.user.farmer_name || '',
        farmer_last_name: req.user.farmer_last_name || '',
        farmerId: farmerId
      };
    } catch (error) {
      console.error('Farmer profile error:', error);
      throw new HttpException(
        error.message || 'Profil bilgileri getirilirken hata oluştu',
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

  // Mağaza bilgilerini getir
  @Get('store/info')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftçinin mağaza bilgilerini getir' })
  async getStoreInfo(@Req() req: any) {
    try {
      console.log('=== Store Info Request ===');
      console.log('Request user:', req.user);
      console.log('Farmer ID:', req.user?.farmerId);
      
      const farmerId = req.user.farmerId;
      if (!farmerId) {
        throw new Error('Farmer ID bulunamadı');
      }
      
      return await this.farmerService.getStoreInfo(farmerId);
    } catch (error) {
      console.error('Store info error:', error);
      throw new HttpException(
        error.message || 'Mağaza bilgileri getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Mağaza bilgilerini güncelle (biyografi)
  @Put('store/biography')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftçi biyografisini güncelle' })
  async updateBiography(@Req() req: any, @Body() body: { farmer_biografi: string }) {
    try {
      const farmerId = req.user.farmerId;
      return await this.farmerService.updateBiography(farmerId, body.farmer_biografi);
    } catch (error) {
      throw new HttpException(
        error.message || 'Biyografi güncellenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Mağaza bilgilerini güncelle (biyografi) - Upsert versiyonu
  @Put('store/biography/upsert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftçi biyografisini güncelle (upsert)' })
  async updateBiographyUpsert(@Req() req: any, @Body() body: { farmer_biografi: string }) {
    try {
      const farmerId = req.user.farmerId;
      return await this.farmerService.updateBiographyUpsert(farmerId, body.farmer_biografi);
    } catch (error) {
      throw new HttpException(
        error.message || 'Biyografi güncellenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Çiftlik resimleri yükle
  @Post('store/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiOperation({ summary: 'Çiftlik resimleri yükle' })
  @ApiConsumes('multipart/form-data')
  async uploadFarmImages(@Req() req: any, @UploadedFiles() images: Express.Multer.File[]) {
    try {
      console.log('=== Farm Images Upload Debug ===');
      console.log('Images received count:', images?.length || 0);
      
      if (images && images.length > 0) {
        images.forEach((image, index) => {
          console.log(`Image ${index}:`, {
            originalname: image.originalname,
            mimetype: image.mimetype,
            size: image.size,
            buffer_length: image.buffer?.length,
            has_buffer: !!image.buffer
          });
        });
      }

      const farmerId = req.user.farmerId;
      
      if (!images || images.length === 0) {
        throw new BadRequestException('En az bir resim yüklemelisiniz.');
      }

      // Dosya validasyonu
      for (const image of images) {
        if (image.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.mimetype)) {
          throw new BadRequestException('Sadece JPEG, PNG ve WebP formatları desteklenmektedir.');
        }
        if (!image.buffer || image.buffer.length === 0) {
          throw new BadRequestException('Dosya içeriği boş olamaz.');
        }
      }

      return await this.farmerService.uploadFarmImages(farmerId, images);
    } catch (error) {
      console.error('Farm images upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Resimler yüklenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Çiftlik sertifikaları yükle
  @Post('store/certificates')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('certificates', 10))
  @ApiOperation({ summary: 'Çiftlik sertifikaları yükle' })
  @ApiConsumes('multipart/form-data')
  async uploadFarmCertificates(@Req() req: any, @UploadedFiles() certificates: Express.Multer.File[]) {
    try {
      console.log('=== Farm Certificates Upload Debug ===');
      console.log('Certificates received count:', certificates?.length || 0);
      
      if (certificates && certificates.length > 0) {
        certificates.forEach((cert, index) => {
          console.log(`Certificate ${index}:`, {
            originalname: cert.originalname,
            mimetype: cert.mimetype,
            size: cert.size,
            buffer_length: cert.buffer?.length,
            has_buffer: !!cert.buffer
          });
        });
      }

      const farmerId = req.user.farmerId;
      
      if (!certificates || certificates.length === 0) {
        throw new BadRequestException('En az bir sertifika yüklemelisiniz.');
      }

      // Dosya validasyonu
      for (const cert of certificates) {
        if (cert.size > 5 * 1024 * 1024) {
          throw new BadRequestException('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        }
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedMimeTypes.includes(cert.mimetype)) {
          throw new BadRequestException('Sadece JPEG, PNG ve PDF formatları desteklenmektedir.');
        }
        if (!cert.buffer || cert.buffer.length === 0) {
          throw new BadRequestException('Dosya içeriği boş olamaz.');
        }
      }

      return await this.farmerService.uploadFarmCertificates(farmerId, certificates);
    } catch (error) {
      console.error('Farm certificates upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Sertifikalar yüklenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Çiftlik resimlerini getir
  @Get('store/images')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftlik resimlerini getir' })
  async getFarmImages(@Req() req: any) {
    try {
      const farmerId = req.user.farmerId;
      return await this.farmerService.getFarmImages(farmerId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Resimler getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Çiftlik sertifikalarını getir
  @Get('store/certificates')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftlik sertifikalarını getir' })
  async getFarmCertificates(@Req() req: any) {
    try {
      const farmerId = req.user.farmerId;
      return await this.farmerService.getFarmCertificates(farmerId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Sertifikalar getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Çiftlik resmi sil
  @Delete('store/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftlik resmini sil' })
  async deleteFarmImage(@Req() req: any, @Param('imageId') imageId: string) {
    try {
      const farmerId = req.user.farmerId;
      return await this.farmerService.deleteFarmImage(farmerId, imageId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Resim silinirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Çiftlik sertifikası sil
  @Delete('store/certificates/:certificateId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Çiftlik sertifikasını sil' })
  async deleteFarmCertificate(@Req() req: any, @Param('certificateId') certificateId: string) {
    try {
      const farmerId = req.user.farmerId;
      return await this.farmerService.deleteFarmCertificate(farmerId, certificateId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Sertifika silinirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Test için - farmer ID ile günlük gelir raporu
  @Get('test/:farmerId/reports/daily/:date')
  @ApiOperation({ summary: 'Test: Günlük gelir raporları' })
  async getDailyIncomeReportsTest(
    @Param('farmerId') farmerId: string,
    @Param('date') date: string
  ) {
    try {
      return await this.farmerService.getDailyIncomeReports(farmerId, date);
    } catch (error) {
      throw new HttpException(
        error.message || 'Günlük gelir raporları getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Test için - farmer ID ile genel gelir raporları
  @Get('income-reports/test/:farmerId')
  @ApiOperation({ summary: 'Test: Genel gelir raporları' })
  async getIncomeReportsTest(
    @Param('farmerId') farmerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      console.log('=== Gelir Raporları Test Endpoint ===');
      console.log('Farmer ID:', farmerId);
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);
      
      return await this.farmerService.getFarmerIncomeReports(farmerId, startDate, endDate);
    } catch (error) {
      console.error('Gelir raporları test endpoint hatası:', error);
      throw new HttpException(
        error.message || 'Gelir raporları getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Mağaza durumunu güncelle
  @Put('store/activity')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mağaza durumunu güncelle' })
  @ApiResponse({ status: 200, description: 'Mağaza durumu başarıyla güncellendi.' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri.' })
  async updateStoreActivity(@Req() req: any, @Body() body: { storeActivity: 'active' | 'nonactive' }) {
    try {
      const farmerId = req.user.farmerId;
      if (!farmerId) {
        throw new Error('Farmer ID bulunamadı');
      }

      const { storeActivity } = body;
      if (!storeActivity || !['active', 'nonactive'].includes(storeActivity)) {
        throw new Error('Geçerli bir mağaza durumu belirtmelisiniz (active/nonactive)');
      }
      
      return await this.farmerService.updateStoreActivity(farmerId, storeActivity);
    } catch (error) {
      throw new HttpException(
        error.message || 'Mağaza durumu güncellenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Mağaza durumunu getir
  @Get('store/activity')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mağaza durumunu getir' })
  @ApiResponse({ status: 200, description: 'Mağaza durumu başarıyla getirildi.' })
  async getStoreActivity(@Req() req: any) {
    try {
      const farmerId = req.user.farmerId;
      if (!farmerId) {
        throw new Error('Farmer ID bulunamadı');
      }
      
      return await this.farmerService.getStoreActivity(farmerId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Mağaza durumu getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}