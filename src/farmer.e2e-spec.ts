import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('FarmerController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/farmer/profile (GET)', () => {
    it('should return 401 when no token provided', () => {
      return request(app.getHttpServer())
        .get('/farmer/profile')
        .expect(401);
    });

    it('should return 401 when invalid token provided', () => {
      return request(app.getHttpServer())
        .get('/farmer/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return profile when valid token provided', async () => {
      const token = jwtService.sign({ farmerId: '123' });

      return request(app.getHttpServer())
        .get('/farmer/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('email');
        });
    });
  });

  describe('/farmer/products (GET)', () => {
    it('should return 401 when no token provided', () => {
      return request(app.getHttpServer())
        .get('/farmer/products')
        .expect(401);
    });

    it('should return products when valid token provided', async () => {
      const token = jwtService.sign({ farmerId: '123' });

      return request(app.getHttpServer())
        .get('/farmer/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
}); 