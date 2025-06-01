// src/modules/products/product.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { SupabaseService } from '../common/services/supabase.service';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    MulterModule.register({
      storage: memoryStorage(), // Memory storage kullan, Supabase için
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
    AuthModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, SupabaseService],
  exports: [ProductService],
})
export class ProductModule {}