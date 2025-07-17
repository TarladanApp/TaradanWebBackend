import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderProduct } from './entities/order-product.entity';
import { SupabaseService } from '../common/services/supabase.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderProduct])],
  controllers: [OrderController],
  providers: [OrderService, SupabaseService],
  exports: [OrderService],
})
export class OrderModule {} 