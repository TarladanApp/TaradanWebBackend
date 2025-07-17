import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrderProductStatus } from '../enums/order-product-status.enum';

@Entity('order_products')
export class OrderProduct {
  @PrimaryGeneratedColumn('uuid')
  order_product_id: string;

  @Column('uuid')
  order_id: string;

  @Column('uuid')
  product_id: string;

  @Column('uuid')
  farmer_id: string;

  @Column()
  farmer_name: string;

  @Column('int')
  unit_quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unit_price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total_product_price: number;

  @Column({
    name: 'order_product_rate',
    type: 'int',
    nullable: true
  })
  order_product_rate?: number;

  @Column('uuid')
  delivery_address_id: string;

  @Column()
  product_name: string;

  @Column({
    name: 'order_product_status',
    type: 'enum',
    enum: OrderProductStatus,
    default: OrderProductStatus.Pending
  })
  order_product_status: OrderProductStatus;

  @Column({
    type: 'text',
    nullable: true
  })
  review_comment?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// Backward compatibility interface
export interface OrderProductInterface {
  order_id: string;
  order_product_id: string;
  farmer_id: string;
  farmer_name: string;
  unit_quantity: number;
  unit_price: number;
  total_product_price: number;
  order_product_rate?: number;
  delivery_address_id: string;
  product_name: string;
  product_id: string;
  order_product_status?: string;
}

export interface OrderProductWithProductDetails extends OrderProductInterface {
  product_image_url?: string;
  product_description?: string;
} 