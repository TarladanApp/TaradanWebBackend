import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupabaseService } from '../common/services/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: ProductService;

  const mockProductService = {
    create: jest.fn(),
    findAllByFarmer: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    testTableStructure: jest.fn(),
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
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
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

    controller = module.get<ProductController>(ProductController);
    productService = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const createProductDto: CreateProductDto = {
        product_name: 'Test Product',
        product_katalog_name: 'Test Description',
        farmer_price: '100',
        stock_quantity: '50',
      };

      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const mockUser = {
        farmerId: '123',
      };

      const mockResult = {
        id: 1,
        product_name: 'Test Product',
        farmer_price: 100,
        stock_quantity: 50,
      };

      mockProductService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createProductDto, mockFile, { user: mockUser, body: createProductDto });
      
      expect(result).toEqual(mockResult);
      expect(productService.create).toHaveBeenCalledWith(
        {
          ...createProductDto,
          farmer_price: 100,
          stock_quantity: 50,
        },
        '123',
        mockFile
      );
    });

    it('should handle service error', async () => {
      const createProductDto: CreateProductDto = {
        product_name: 'Test Product',
        product_katalog_name: 'Test Description',
        farmer_price: '100',
        stock_quantity: '50',
      };

      const mockUser = {
        farmerId: '123',
      };

      mockProductService.create.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(createProductDto, null, { user: mockUser, body: createProductDto }))
        .rejects.toThrow('Service error');
    });
  });

  describe('findAllByFarmer', () => {
    it('should return farmer products', async () => {
      const mockUser = {
        farmerId: '123',
      };

      const mockProducts = [
        {
          id: 1,
          product_name: 'Product 1',
          farmer_price: 100,
        },
        {
          id: 2,
          product_name: 'Product 2',
          farmer_price: 200,
        },
      ];

      mockProductService.findAllByFarmer.mockResolvedValue(mockProducts);

      const result = await controller.findAllByFarmer({ user: mockUser });
      
      expect(result).toEqual(mockProducts);
      expect(productService.findAllByFarmer).toHaveBeenCalledWith('123');
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const mockProduct = {
        id: 1,
        product_name: 'Test Product',
        farmer_price: 100,
      };

      mockProductService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('1');
      
      expect(result).toEqual(mockProduct);
      expect(productService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const updateProductDto: UpdateProductDto = {
        product_name: 'Updated Product',
        farmer_price: '150',
      };

      const mockUser = {
        farmerId: '123',
      };

      const mockResult = {
        id: 1,
        product_name: 'Updated Product',
        farmer_price: 150,
      };

      mockProductService.update.mockResolvedValue(mockResult);

      const result = await controller.update('1', updateProductDto, null, { user: mockUser });
      
      expect(result).toEqual(mockResult);
      expect(productService.update).toHaveBeenCalledWith(
        '1',
        {
          ...updateProductDto,
          farmer_price: 150,
        },
        '123',
        null
      );
    });

    it('should handle authorization error', async () => {
      const updateProductDto: UpdateProductDto = {
        product_name: 'Updated Product',
      };

      const mockUser = {
        farmerId: '123',
      };

      mockProductService.update.mockRejectedValue(new Error('Bu ürünü düzenleme yetkiniz yok'));

      const result = await controller.update('1', updateProductDto, null, { user: mockUser });
      
      expect(result).toEqual({
        statusCode: 403,
        message: 'Bu ürünü düzenleme yetkiniz yok',
      });
    });

    it('should handle not found error', async () => {
      const updateProductDto: UpdateProductDto = {
        product_name: 'Updated Product',
      };

      const mockUser = {
        farmerId: '123',
      };

      mockProductService.update.mockRejectedValue(new Error('Ürün bulunamadı'));

      const result = await controller.update('1', updateProductDto, null, { user: mockUser });
      
      expect(result).toEqual({
        statusCode: 404,
        message: 'Ürün bulunamadı',
      });
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      const mockUser = {
        farmerId: '123',
      };

      const mockResult = {
        success: true,
        message: 'Ürün başarıyla silindi',
      };

      mockProductService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove('1', { user: mockUser });
      
      expect(result).toEqual(mockResult);
      expect(productService.remove).toHaveBeenCalledWith('1', '123');
    });

    it('should handle authorization error on delete', async () => {
      const mockUser = {
        farmerId: '123',
      };

      mockProductService.remove.mockRejectedValue(new Error('Bu ürünü silme yetkiniz yok'));

      const result = await controller.remove('1', { user: mockUser });
      
      expect(result).toEqual({
        statusCode: 403,
        message: 'Bu ürünü silme yetkiniz yok',
      });
    });
  });

  describe('testTableStructure', () => {
    it('should test table structure', async () => {
      const mockUser = {
        farmerId: '123',
      };

      const mockResult = {
        success: true,
        message: 'Table structure test passed',
      };

      mockProductService.testTableStructure.mockResolvedValue(mockResult);

      const result = await controller.testTableStructure({ user: mockUser });
      
      expect(result).toEqual(mockResult);
      expect(productService.testTableStructure).toHaveBeenCalledWith('123');
    });

    it('should handle table structure test error', async () => {
      const mockUser = {
        farmerId: '123',
      };

      mockProductService.testTableStructure.mockRejectedValue(new Error('Table error'));

      const result = await controller.testTableStructure({ user: mockUser });
      
      expect(result).toEqual({
        error: 'Table error',
        details: expect.any(Error),
      });
    });
  });
}); 