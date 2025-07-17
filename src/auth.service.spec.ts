import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';
import { SupabaseService } from '../src/common/services/supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      auth: {
        signInWithPassword: jest.fn(),
      },
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_EXPIRES_IN') return '1h';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object when credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      mockSupabaseService.getClient().auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeDefined();
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw error when credentials are invalid', async () => {
      mockSupabaseService.getClient().auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      await expect(service.validateUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Giriş başarısız: Invalid credentials');
    });
  });

  describe('login', () => {
    it('should return JWT token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
      };

      const mockToken = 'jwt-token';
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      const result = await service.login(mockUser);
      expect(result).toEqual({
        access_token: mockToken,
        expires_in: 86400,
        token_type: 'Bearer',
      });
    });
  });
}); 