import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  farmer_id: number;

  @Column({ length: 255 })
  product_name: string;

  @Column({ length: 255 })
  product_katalog_name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  farmer_price: number;

  @Column()
  stock_quantity: number;

  @Column({ nullable: true })
  product_image: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}