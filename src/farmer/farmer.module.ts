import { Module } from '@nestjs/common';
import { FarmerController } from './farmer.controller';
import { FarmerService } from './farmer.service';
import { SupabaseService } from '../common/services/supabase.service';

@Module({
  controllers: [FarmerController],
  providers: [FarmerService, SupabaseService],
  exports: [FarmerService]
})
export class FarmerModule {} 