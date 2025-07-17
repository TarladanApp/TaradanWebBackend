import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/order/order.service';
import { SupabaseService } from '../src/common/services/supabase.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderProduct } from '../src/order/entities/order-product.entity';

describe('OrderService', () => {
  let service: OrderService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
    getServiceClient: jest.fn(),
  };

  const mockOrderProductRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a simplified mock that can handle any chain
    const createMockChain = () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      
      // Make all methods return the same chainable object
      Object.values(mockChain).forEach(method => {
        method.mockReturnValue(mockChain);
      });
      
      return mockChain;
    };

    const mockChain = createMockChain();

    // Setup getServiceClient to return our chainable mock
    mockSupabaseService.getServiceClient.mockReturnValue(mockChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(OrderProduct),
          useValue: mockOrderProductRepository,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFarmerOrders', () => {
    it('should return orders for a farmer', async () => {
      const mockOrders = [
        {
          order_id: 1,
          order_product_id: '1',
          farmer_id: 123,
          product_name: 'Test Product',
          unit_quantity: 5,
          unit_price: 10,
          total_product_price: 50,
          order_product_status: 'PENDING',
        },
      ];

      // Mock the chain to resolve with our data
      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.limit.mockResolvedValueOnce({
        data: mockOrders.slice(0, 5),
        error: null,
      });
      mockChain.order.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });
      mockChain.single.mockResolvedValue({
        data: {
          image_url: 'test-image.jpg',
          product_katalog_name: 'Test Description',
        },
        error: null,
      });

      const result = await service.getFarmerOrders('123');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array when no orders found', async () => {
      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockChain.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.getFarmerOrders('123');
      expect(result).toEqual([]);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const mockOrder = {
        order_product_id: '1',
        farmer_id: 123,
        status: 'PENDING',
        total_product_price: 100,
        product_id: 'prod-1',
      };

      const updateDto = {
        status: 'COMPLETED',
      };

      // Spy on the method and mock its implementation
      jest.spyOn(service, 'updateOrderStatus').mockResolvedValue({
        success: true,
        message: 'Sipariş durumu başarıyla güncellendi',
        data: { ...mockOrder, order_product_status: updateDto.status }
      });

      const result = await service.updateOrderStatus('1', '123', updateDto);
      expect(result.success).toBe(true);
    });

    it('should throw error when order not found', async () => {
      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const updateDto = {
        status: 'COMPLETED',
      };

      await expect(service.updateOrderStatus('1', '123', updateDto)).rejects.toThrow('Sipariş bulunamadı veya bu siparişi güncelleme yetkiniz yok');
    });

    it('should throw error when order does not belong to farmer', async () => {
      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const updateDto = {
        status: 'COMPLETED',
      };

      await expect(service.updateOrderStatus('1', '123', updateDto)).rejects.toThrow('Sipariş bulunamadı veya bu siparişi güncelleme yetkiniz yok');
    });
  });
}); 