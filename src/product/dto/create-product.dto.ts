import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  product_name: string;

  @IsString()
  @IsNotEmpty()
  product_katalog_name: string;

  @IsNumber()
  @Min(0)
  farmer_price: number;

  @IsNumber()
  @Min(0)
  stock_quantity: number;
} 