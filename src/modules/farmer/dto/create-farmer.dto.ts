import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, IsEnum, IsNumber, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { Express } from 'express';

export enum ActivityStatus {
  Active = 'Active',
  NonActive = 'NonActive'
}

export enum StoreActivityStatus {
  Active = 'active',
  NonActive = 'nonactive'
}

export class CreateFarmerDto {
  @ApiProperty({ description: 'Çiftçi şifresi' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  farmer_password: string;

  @ApiProperty({ description: 'Çiftçinin adı' })
  @IsString()
  @IsNotEmpty()
  farmer_name: string;

  @ApiProperty({ description: 'Çiftçinin soyadı' })
  @IsString()
  @IsNotEmpty()
  farmer_last_name: string;

  @ApiProperty({ description: 'Çiftçinin yaşı' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  farmer_age: number;

  @ApiProperty({ description: 'Çiftçinin adresi' })
  @IsString()
  @IsNotEmpty()
  farmer_address: string;

  @ApiProperty({ description: 'Çiftçinin şehri' })
  @IsString()
  @IsNotEmpty()
  farmer_city: string;

  @ApiProperty({ description: 'Çiftçinin ilçesi' })
  @IsString()
  @IsNotEmpty()
  farmer_town: string;

  @ApiProperty({ description: 'Çiftçi mahallesi' })
  @IsString()
  @IsNotEmpty()
  farmer_neighbourhood: string;

  @ApiProperty({ description: 'Çiftçinin telefon numarası' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  farmer_phone_number: string;

  @ApiProperty({ description: 'Çiftçinin e-posta adresi' })
  @IsEmail()
  @IsNotEmpty()
  farmer_mail: string;

  @ApiProperty({ description: 'Çiftçi aktivite durumu', enum: ActivityStatus })
  @IsEnum(ActivityStatus)
  @IsNotEmpty()
  farmer_activity_status: ActivityStatus;

  @ApiProperty({ description: 'Çiftçi mağaza durumu', enum: StoreActivityStatus })
  @IsEnum(StoreActivityStatus)
  @IsOptional()
  farmer_store_activity?: StoreActivityStatus;

  @ApiProperty({ description: 'Çiftlik adı' })
  @IsString()
  @IsNotEmpty()
  farm_name: string;

  @ApiProperty({ description: 'Çiftçi TC kimlik numarası' })
  @IsString()
  @IsNotEmpty()
  @MinLength(11)
  farmer_tc_no: string;

  @ApiProperty({ description: 'Profil resmi URL', required: false })
  @IsString()
  @IsOptional()
  imgurl?: string;
}

export class LoginFarmerDto {
  @ApiProperty({ description: 'Çiftçi e-posta adresi' })
  @IsEmail()
  @IsNotEmpty()
  farmer_mail: string;

  @ApiProperty({ description: 'Çiftçi şifresi' })
  @IsString()
  @IsNotEmpty()
  farmer_password: string;
}