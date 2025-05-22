import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { FarmerService } from './farmer.service';

@Controller('farmer')
export class FarmerController {
  constructor(private readonly farmerService: FarmerService) {}

  @Post()
  async createFarmer(@Body() farmerData: any) {
    return await this.farmerService.createFarmer(farmerData);
  }

  @Get(':id')
  async getFarmer(@Param('id') id: string) {
    return await this.farmerService.getFarmerById(id);
  }

  @Put(':id')
  async updateFarmer(@Param('id') id: string, @Body() farmerData: any) {
    return await this.farmerService.updateFarmer(id, farmerData);
  }

  @Delete(':id')
  async deleteFarmer(@Param('id') id: string) {
    return await this.farmerService.deleteFarmer(id);
  }
} 