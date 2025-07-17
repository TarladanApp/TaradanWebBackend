import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../src/order/order.controller';
import { OrderService } from '../src/order/order.service';
import { UpdateOrderStatusDto } from '../src/order/dto/update-order-status.dto';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { SupabaseService } from '../src/common/services/supabase.service';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;

  const mockOrderService = {
    getFarmerOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(),
    getServiceClient: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFarmerOrders', () => {
    it('should return farmer orders successfully', async () => {
      const mockUser = {
        farmerId: '123',
      };

      const mockOrders = [
        {
          id: 1,
          status: 'PENDING',
        },
      ];

      mockOrderService.getFarmerOrders.mockResolvedValue(mockOrders);

      const result = await controller.getFarmerOrders({ user: mockUser });
      expect(result).toEqual({
        success: true,
        data: mockOrders,
        message: 'Siparişler başarıyla getirildi',
      });
      expect(orderService.getFarmerOrders).toHaveBeenCalledWith('123');
    });

    it('should throw error when farmerId is not found', async () => {
      const mockUser = {};

      await expect(controller.getFarmerOrders({ user: mockUser })).rejects.toThrow('Farmer ID bulunamadı');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const mockUser = {
        farmerId: '123',
      };

      const mockUpdateDto: UpdateOrderStatusDto = {
        status: 'COMPLETED',
      };

      const mockResult = {
        success: true,
        message: 'Sipariş durumu güncellendi',
      };

      mockOrderService.updateOrderStatus.mockResolvedValue(mockResult);

      const result = await controller.updateOrderStatus('456', mockUpdateDto, { user: mockUser });
      expect(result).toEqual(mockResult);
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith('456', '123', mockUpdateDto);
    });

    it('should throw error when farmerId is not found', async () => {
      const mockUser = {};
      const mockUpdateDto: UpdateOrderStatusDto = {
        status: 'COMPLETED',
      };

      await expect(controller.updateOrderStatus('456', mockUpdateDto, { user: mockUser })).rejects.toThrow('Farmer ID bulunamadı');
    });
  });
}); 