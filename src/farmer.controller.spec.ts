import { Test, TestingModule } from '@nestjs/testing';
import { FarmerController } from '../src/farmer/farmer.controller';
import { FarmerService } from '../src/farmer/farmer.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { SupabaseService } from '../src/common/services/supabase.service';

describe('FarmerController', () => {
  let controller: FarmerController;
  let farmerService: FarmerService;

  const mockFarmerService = {
    getFarmerById: jest.fn(),
    updateFarmer: jest.fn(),
    deleteFarmer: jest.fn(),
    loginFarmer: jest.fn(),
    getStoreInfo: jest.fn(),
    updateBiography: jest.fn(),
    updateBiographyUpsert: jest.fn(),
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
      controllers: [FarmerController],
      providers: [
        {
          provide: FarmerService,
          useValue: mockFarmerService,
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

    controller = module.get<FarmerController>(FarmerController);
    farmerService = module.get<FarmerService>(FarmerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFarmerProfile', () => {
    it('should return farmer profile successfully', async () => {
      const mockUser = {
        farmerId: '123',
        farmer_name: 'Test',
        farmer_last_name: 'Farmer',
      };

      const result = await controller.getFarmerProfile({ user: mockUser });
      expect(result).toEqual({
        farmer_name: 'Test',
        farmer_last_name: 'Farmer',
        farmerId: '123',
      });
    });

    it('should throw error when farmerId is not found', async () => {
      const mockUser = {};

      await expect(controller.getFarmerProfile({ user: mockUser })).rejects.toThrow('Farmer ID bulunamadı');
    });
  });

  describe('getFarmer', () => {
    it('should return farmer by id', async () => {
      const mockFarmer = {
        id: '123',
        name: 'Test Farmer',
      };

      mockFarmerService.getFarmerById.mockResolvedValue(mockFarmer);

      const result = await controller.getFarmer('123');
      expect(result).toEqual(mockFarmer);
      expect(farmerService.getFarmerById).toHaveBeenCalledWith('123');
    });
  });
}); 