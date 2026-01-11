import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Ürün adı' })
  @IsString()
  @IsNotEmpty()
  product_name: string;

  @ApiProperty({ description: 'Ürün katalog adı' })
  @IsString()
  @IsNotEmpty()
  product_katalog_name: string;

  @ApiProperty({ description: 'Çiftçi fiyatı', type: Number })
  @Transform(({ value }) => {
    // String olarak gelebilir (multipart form data)
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  farmer_price: number;

  @ApiProperty({ description: 'Stok miktarı', type: Number })
  @Transform(({ value }) => {
    // String olarak gelebilir (multipart form data)
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsNumber()
  @Min(0)
  stock_quantity: number;

  @ApiProperty({ description: 'Ürün resmi', required: false })
  @IsOptional()
  file?: any;
} 