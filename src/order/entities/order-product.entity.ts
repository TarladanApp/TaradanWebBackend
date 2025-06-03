export interface OrderProduct {
  order_id: string;
  order_product_id: string;
  farmer_id: string;
  farmer_name: string;
  unit_quantity: number;
  unit_price: number;
  total_product_price: number;
  order_product_rate?: number;
  delivery_address_id: string;
  product_name: string;
  product_id: string;
  order_product_status?: string;
}

export interface OrderProductWithProductDetails extends OrderProduct {
  product_image_url?: string;
  product_description?: string;
} 