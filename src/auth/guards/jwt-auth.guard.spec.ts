import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseService } from '../../common/services/supabase.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getServiceClient: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockChain = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockSupabaseService.getServiceClient.mockReturnValue(mockChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for valid token and active farmer', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const mockRequest: any = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };

      const mockFarmerData = {
        farmer_id: '123',
        farmer_name: 'Test',
        farmer_last_name: 'Farmer',
        farmer_activity_status: 'Active',
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.single.mockResolvedValue({
        data: mockFarmerData,
        error: null,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: '1234567890',
        farmerId: '123',
        email: 'test@example.com',
        farmer_name: 'Test',
        farmer_last_name: 'Farmer',
      });
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      const mockRequest = {
        headers: {},
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow('Token bulunamadı');
    });

    it('should throw UnauthorizedException when authorization header format is wrong', async () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow('Token bulunamadı');
    });

    it('should throw UnauthorizedException when token format is invalid', async () => {
      const invalidToken = 'invalid.token'; // Only 2 parts instead of 3

      const mockRequest = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when farmer is not found', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow('Farmer bulunamadı');
    });

    it('should throw UnauthorizedException when farmer is not active', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };

      const mockFarmerData = {
        farmer_id: '123',
        farmer_name: 'Test',
        farmer_last_name: 'Farmer',
        farmer_activity_status: 'Inactive',
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockChain = mockSupabaseService.getServiceClient();
      mockChain.single.mockResolvedValue({
        data: mockFarmerData,
        error: null,
      });

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow('Hesabınız aktif değil');
    });

    it('should throw UnauthorizedException when token has no sub field', async () => {
      // Token without sub field
      const tokenWithoutSub = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KM';

      const mockRequest = {
        headers: {
          authorization: `Bearer ${tokenWithoutSub}`,
        },
      };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow('User ID bulunamadı');
    });
  });
}); 