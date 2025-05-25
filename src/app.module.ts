import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FarmerModule } from './farmer/farmer.module';
import { SupabaseService } from './common/services/supabase.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    FarmerModule
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, SupabaseService],
})
export class AppModule {}
