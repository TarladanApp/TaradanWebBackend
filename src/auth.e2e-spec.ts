import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../src/common/services/supabase.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      auth: {
        signInWithPassword: jest.fn(),
      },
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(mockSupabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should return 401 when credentials are invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return JWT token when credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
      };

      mockSupabaseService.getClient().auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });
  });
}); 