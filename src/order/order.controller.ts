import { Controller, Get, Patch, Param, Body, UseGuards, Request, HttpException, HttpStatus, Put } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('farmer')
  async getFarmerOrders(@Request() req) {
    try {
      console.log('=== Get Farmer Orders Debug ===');
      console.log('Full request user object:', JSON.stringify(req.user, null, 2));
      console.log('farmerId from user:', req.user.farmerId);
      console.log('farmerId type:', typeof req.user.farmerId);
      
      const farmerId = req.user.farmerId;
      if (!farmerId) {
        throw new HttpException('Farmer ID bulunamadı', HttpStatus.UNAUTHORIZED);
      }

      console.log('Calling service with farmerId:', farmerId.toString());
      const orders = await this.orderService.getFarmerOrders(farmerId.toString());
      
      console.log('Service returned orders count:', orders.length);
      console.log('Orders data:', JSON.stringify(orders, null, 2));
      
      return {
        success: true,
        data: orders,
        message: 'Siparişler başarıyla getirildi'
      };
    } catch (error) {
      console.error('Controller error in getFarmerOrders:', error);
      throw new HttpException(
        error.message || 'Siparişler getirilirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Patch(':orderProductId/status')
  async updateOrderStatus(
    @Param('orderProductId') orderProductId: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @Request() req
  ) {
    try {
      console.log('=== Update Order Status ===');
      console.log('Order Product ID:', orderProductId);
      console.log('Update DTO:', updateDto);
      console.log('User from request:', req.user);

      const farmerId = req.user.farmerId;
      if (!farmerId) {
        throw new HttpException('Farmer ID bulunamadı', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.orderService.updateOrderStatus(
        orderProductId,
        farmerId.toString(),
        updateDto
      );

      return result;
    } catch (error) {
      console.error('Controller error in updateOrderStatus:', error);
      
      if (error.status) {
        throw error; // HttpException'ı olduğu gibi ilet
      }
      
      throw new HttpException(
        error.message || 'Sipariş durumu güncellenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put('test/status/:orderProductId/:farmerId')
  @ApiOperation({ summary: 'Test - Sipariş durumu güncelle (auth bypass)' })
  async updateOrderStatusTest(
    @Param('orderProductId') orderProductId: string,
    @Param('farmerId') farmerId: string,
    @Body() updateDto: UpdateOrderStatusDto
  ) {
    try {
      console.log('=== Test Update Order Status ===');
      console.log('Order Product ID:', orderProductId);
      console.log('Farmer ID:', farmerId);
      console.log('New Status:', updateDto.status);
      
      const result = await this.orderService.updateOrderStatus(orderProductId, farmerId, updateDto);
      return result;
    } catch (error: any) {
      console.error('Test update order status error:', error);
      throw new HttpException(
        error.message || 'Sipariş durumu güncellenirken hata oluştu',
        HttpStatus.BAD_REQUEST
      );
    }
  }
} 