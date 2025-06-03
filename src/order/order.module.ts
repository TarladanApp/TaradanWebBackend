import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { SupabaseService } from '../common/services/supabase.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, SupabaseService],
  exports: [OrderService],
})
export class OrderModule {} 