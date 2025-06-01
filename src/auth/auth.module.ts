import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SupabaseService } from '../common/services/supabase.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'dummy-secret', // Supabase kendi verification yapar
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [JwtStrategy, SupabaseService],
  exports: [JwtModule],
})
export class AuthModule {} 