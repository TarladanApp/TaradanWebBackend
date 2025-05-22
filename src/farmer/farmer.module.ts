import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FarmerController } from './farmer.controller';
import { FarmerService } from './farmer.service';

@Module({
  imports: [ConfigModule],
  controllers: [FarmerController],
  providers: [FarmerService],
})
export class FarmerModule {} 