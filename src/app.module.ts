import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { FarmerModule } from './modules/farmer/farmer.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { CommonModule } from './common/common.module';
import { Product } from './entities/product.entity';
import { Farmer } from './entities/farmer.entity';
import { Order } from './entities/order.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('SUPABASE_DB_URL') || configService.get<string>('DATABASE_URL');
        const dbHost = configService.get<string>('DB_HOST');
        const dbPort = configService.get<number>('DB_PORT') || 5432;
        const dbUsername = configService.get<string>('DB_USERNAME');
        const dbPassword = configService.get<string>('DB_PASSWORD');
        const dbName = configService.get<string>('DB_NAME');

        console.log('--- Database Config Check ---');
        console.log('SUPABASE_DB_URL mevcut:', !!configService.get('SUPABASE_DB_URL'));
        console.log('DATABASE_URL mevcut:', !!configService.get('DATABASE_URL'));
        console.log('DB_HOST:', dbHost);
        console.log('DB_PORT:', dbPort);
        console.log('DB_USERNAME:', dbUsername);
        console.log('DB_NAME:', dbName);
        console.log('DB_PASSWORD mevcut:', !!dbPassword);
        console.log('---------------------------');

        const options: any = {
          type: 'postgres',
          entities: [Product, Farmer, Order],
          synchronize: false,
          ssl: {
            rejectUnauthorized: false,
          },
          logging: true,
        };

        if (dbUrl) {
          options.url = dbUrl;
        } else {
          options.host = dbHost;
          options.port = dbPort;
          options.username = dbUsername;
          options.password = dbPassword;
          options.database = dbName;
        }

        return options;
      },
    }),
    MulterModule.register({
      dest: './uploads',
    }),
    CommonModule,
    AuthModule,
    FarmerModule,
    ProductModule,
    OrderModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
