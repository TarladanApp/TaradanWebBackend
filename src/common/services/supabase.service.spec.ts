import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    createSignedUrl: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
};

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('SupabaseService', () => {
  let service: SupabaseService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'SUPABASE_URL':
          return 'https://test-supabase-url.supabase.co';
        case 'SUPABASE_KEY':
          return 'test-supabase-key';
        case 'SUPABASE_SERVICE_ROLE_KEY':
          return 'test-service-role-key';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize clients with correct config', () => {
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_URL');
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_KEY');
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      const mockConfigServiceMissingUrl = {
        get: jest.fn((key: string) => {
          switch (key) {
            case 'SUPABASE_URL':
              return null;
            case 'SUPABASE_KEY':
              return 'test-supabase-key';
            case 'SUPABASE_SERVICE_ROLE_KEY':
              return 'test-service-role-key';
            default:
              return null;
          }
        }),
      };

      expect(() => {
        new SupabaseService(mockConfigServiceMissingUrl as any);
      }).toThrow('Supabase URL ve Key değerleri eksik!');
    });

    it('should throw error when SUPABASE_KEY is missing', () => {
      const mockConfigServiceMissingKey = {
        get: jest.fn((key: string) => {
          switch (key) {
            case 'SUPABASE_URL':
              return 'https://test-supabase-url.supabase.co';
            case 'SUPABASE_KEY':
              return null;
            case 'SUPABASE_SERVICE_ROLE_KEY':
              return 'test-service-role-key';
            default:
              return null;
          }
        }),
      };

      expect(() => {
        new SupabaseService(mockConfigServiceMissingKey as any);
      }).toThrow('Supabase URL ve Key değerleri eksik!');
    });

    it('should throw error when SERVICE_ROLE_KEY is missing', () => {
      const mockConfigServiceMissingServiceKey = {
        get: jest.fn((key: string) => {
          switch (key) {
            case 'SUPABASE_URL':
              return 'https://test-supabase-url.supabase.co';
            case 'SUPABASE_KEY':
              return 'test-supabase-key';
            case 'SUPABASE_SERVICE_ROLE_KEY':
              return null;
            default:
              return null;
          }
        }),
      };

      expect(() => {
        new SupabaseService(mockConfigServiceMissingServiceKey as any);
      }).toThrow('Service Role Key değeri eksik!');
    });
  });

  describe('getClient', () => {
    it('should return the supabase client', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client).toBe(mockSupabaseClient);
    });
  });

  describe('getServiceClient', () => {
    it('should return the service role client', () => {
      const serviceClient = service.getServiceClient();
      expect(serviceClient).toBeDefined();
      expect(serviceClient).toBe(mockSupabaseClient);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockUploadData = {
        path: 'test-path',
        id: 'test-id',
        fullPath: 'bucket/test-path',
      };

      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: mockUploadData,
        error: null,
      });

      const testBuffer = Buffer.from('test file content');
      const result = await service.uploadFile('test-bucket', 'test-path', testBuffer, 'text/plain');

      expect(result).toEqual(mockUploadData);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith('test-path', testBuffer, {
        contentType: 'text/plain',
        upsert: false,
      });
    });

    it('should handle upload error', async () => {
      const uploadError = { message: 'Upload failed' };

      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: null,
        error: uploadError,
      });

      const testBuffer = Buffer.from('test file content');

      await expect(service.uploadFile('test-bucket', 'test-path', testBuffer, 'text/plain'))
        .rejects.toEqual(uploadError);
    });
  });

  describe('getSignedUrl', () => {
    it('should create signed URL successfully', async () => {
      const mockSignedUrlData = {
        signedUrl: 'https://test-signed-url.com',
      };

      mockSupabaseClient.storage.createSignedUrl.mockResolvedValue({
        data: mockSignedUrlData,
        error: null,
      });

      const result = await service.getSignedUrl('test-bucket', 'test-path');

      expect(result).toEqual(mockSignedUrlData);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockSupabaseClient.storage.createSignedUrl).toHaveBeenCalledWith('test-path', 315360000);
    });

    it('should create signed URL with custom expiry', async () => {
      const mockSignedUrlData = {
        signedUrl: 'https://test-signed-url.com',
      };

      mockSupabaseClient.storage.createSignedUrl.mockResolvedValue({
        data: mockSignedUrlData,
        error: null,
      });

      const customExpiry = 3600; // 1 hour
      const result = await service.getSignedUrl('test-bucket', 'test-path', customExpiry);

      expect(result).toEqual(mockSignedUrlData);
      expect(mockSupabaseClient.storage.createSignedUrl).toHaveBeenCalledWith('test-path', customExpiry);
    });

    it('should handle signed URL creation error', async () => {
      const signedUrlError = { message: 'Signed URL creation failed' };

      mockSupabaseClient.storage.createSignedUrl.mockResolvedValue({
        data: null,
        error: signedUrlError,
      });

      await expect(service.getSignedUrl('test-bucket', 'test-path'))
        .rejects.toEqual(signedUrlError);
    });
  });
}); 