import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  farmer_id: string;

  @Column()
  product_name: string;

  @Column()
  product_katalog_name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  farmer_price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  tarladan_commission: number;

  @Column('decimal', { precision: 10, scale: 2 })
  tarladan_price: number;

  @Column()
  stock_quantity: number;

  @Column({ nullable: true })
  image_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 