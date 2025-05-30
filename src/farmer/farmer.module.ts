import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FarmerController } from './farmer.controller';
import { FarmerService } from './farmer.service';
import { SupabaseService } from '../common/services/supabase.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
          return cb(new Error('Sadece resim ve PDF dosyaları yüklenebilir!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [FarmerController],
  providers: [FarmerService, SupabaseService],
  exports: [FarmerService]
})
export class FarmerModule {} 