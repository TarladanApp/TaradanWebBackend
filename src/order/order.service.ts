import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { OrderProductWithProductDetails } from './entities/order-product.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getFarmerOrders(farmerId: string): Promise<OrderProductWithProductDetails[]> {
    try {
      console.log('Getting orders for farmer:', farmerId);
      console.log('Converting farmerId to number for database query');
      
      const farmerIdNumber = parseInt(farmerId, 10);
      console.log('farmerId as number:', farmerIdNumber);

      // Debug: Önce tüm order_product kayıtlarını kontrol et
      const { data: allOrders, error: allError } = await this.supabaseService.getServiceClient()
        .from('order_product')
        .select('farmer_id, order_id, product_name')
        .limit(5);
      
      console.log('First 5 order_product records for debugging:', allOrders);
      if (allError) console.log('All orders error:', allError);

      // Önce order_product verilerini al
      const { data: orderProducts, error } = await this.supabaseService.getServiceClient()
        .from('order_product')
        .select('*')
        .eq('farmer_id', farmerIdNumber)
        .order('order_id', { ascending: false });

      if (error) {
        console.error('Error fetching farmer orders:', error);
        throw new Error('Siparişler getirilirken hata oluştu: ' + error.message);
      }

      console.log('Raw order products with number farmer_id:', orderProducts);

      // Eğer number ile sonuç alamazsak string ile dene
      if (!orderProducts || orderProducts.length === 0) {
        console.log('Trying with string farmer_id...');
        const { data: orderProductsString, error: errorString } = await this.supabaseService.getServiceClient()
          .from('order_product')
          .select('*')
          .eq('farmer_id', farmerId)
          .order('order_id', { ascending: false });
        
        console.log('Raw order products with string farmer_id:', orderProductsString);
        if (orderProductsString && orderProductsString.length > 0) {
          // String ile bulundu, onu kullan
          orderProducts.push(...orderProductsString);
        }
      }

      // Her sipariş için ürün bilgilerini ayrı ayrı al
      const ordersWithDetails: OrderProductWithProductDetails[] = [];
      
      for (const order of orderProducts) {
        let productImageUrl = null;
        let productDescription = null;

        // Ürün bilgilerini al (eğer product_id varsa)
        if (order.product_id) {
          const { data: productData } = await this.supabaseService.getServiceClient()
            .from('products')
            .select('image_url, product_katalog_name')
            .eq('id', order.product_id)
            .single();

          if (productData) {
            productImageUrl = productData.image_url;
            productDescription = productData.product_katalog_name;
          }
        }

        ordersWithDetails.push({
          order_id: order.order_id,
          order_product_id: order.order_product_id,
          farmer_id: order.farmer_id,
          farmer_name: order.farmer_name,
          unit_quantity: order.unit_quantity,
          unit_price: order.unit_price,
          total_product_price: order.total_product_price,
          order_product_rate: order.order_product_rate,
          delivery_address_id: order.delivery_address_id,
          product_name: order.product_name,
          product_id: order.product_id,
          order_product_status: order.order_product_status,
          product_image_url: productImageUrl,
          product_description: productDescription,
        });
      }

      console.log('Processed orders with details:', ordersWithDetails);
      return ordersWithDetails;

    } catch (error) {
      console.error('Service error in getFarmerOrders:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderProductId: string, farmerId: string, updateDto: UpdateOrderStatusDto): Promise<any> {
    try {
      console.log('Updating order status:', { orderProductId, farmerId, status: updateDto.status });
      
      const farmerIdNumber = parseInt(farmerId, 10);
      console.log('farmerId as number for update:', farmerIdNumber);

      // Önce sipariş bu farmer'a ait mi kontrol et
      const { data: existingOrder, error: checkError } = await this.supabaseService.getServiceClient()
        .from('order_product')
        .select('*')
        .eq('order_product_id', orderProductId)
        .eq('farmer_id', farmerIdNumber)
        .single();

      if (checkError || !existingOrder) {
        throw new NotFoundException('Sipariş bulunamadı veya bu siparişi güncelleme yetkiniz yok');
      }

      // Status'u güncelle
      const { data, error } = await this.supabaseService.getServiceClient()
        .from('order_product')
        .update({ order_product_status: updateDto.status })
        .eq('order_product_id', orderProductId)
        .eq('farmer_id', farmerIdNumber)
        .select();

      if (error) {
        console.error('Error updating order status:', error);
        throw new Error('Sipariş durumu güncellenirken hata oluştu: ' + error.message);
      }

      console.log('Order status updated successfully:', data);
      return { 
        success: true, 
        message: 'Sipariş durumu başarıyla güncellendi',
        data: data[0] 
      };

    } catch (error) {
      console.error('Service error in updateOrderStatus:', error);
      throw error;
    }
  }
} 