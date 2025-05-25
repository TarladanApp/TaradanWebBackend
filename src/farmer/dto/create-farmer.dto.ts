import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, IsEnum } from 'class-validator';

export enum ActivityStatus {
  Active = 'Active',
  NonActive = 'NonActive'
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
  @IsString()
  @IsNotEmpty()
  farmer_age: string;

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

  @ApiProperty({ description: 'Çiftçinin mahallesi' })
  @IsString()
  @IsNotEmpty()
  famer_neighbourhood: string;

  @ApiProperty({ description: 'Çiftçinin telefon numarası' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  farmer_phone_number: string;

  @ApiProperty({ description: 'Çiftçinin e-posta adresi' })
  @IsEmail()
  @IsNotEmpty()
  farmer_mail: string;

  @ApiProperty({ description: 'Çiftçi sertifikaları', required: false })
  @IsString()
  @IsOptional()
  farmer_certificates?: string;

  @ApiProperty({ description: 'Çiftçi aktivite durumu', enum: ActivityStatus })
  @IsEnum(ActivityStatus)
  @IsNotEmpty()
  farmer_activity_status: ActivityStatus;

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