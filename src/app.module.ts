import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth.service';
import { FarmerModule } from './farmer/farmer.module';
import { SupabaseService } from './common/services/supabase.service';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product/entities/product.entity';
import { Farmer } from './farmer/entities/farmer.entity';
import { User } from './auth/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.SUPABASE_DB_URL,
      entities: [Product, Farmer, User],
      synchronize: false,
      ssl: {
        rejectUnauthorized: false
      }
    }),
    FarmerModule,
    AuthModule,
    ProductModule,
    OrderModule
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, SupabaseService],
})
export class AppModule {}
