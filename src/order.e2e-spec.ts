import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('OrderController (e2e)', () => {
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

  describe('/order/farmer (GET)', () => {
    it('should return 401 when no token provided', () => {
      return request(app.getHttpServer())
        .get('/order/farmer')
        .expect(401);
    });

    it('should return 401 when invalid token provided', () => {
      return request(app.getHttpServer())
        .get('/order/farmer')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return orders when valid token provided', async () => {
      const token = jwtService.sign({ farmerId: '123' });

      return request(app.getHttpServer())
        .get('/order/farmer')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('/order/:orderProductId/status (PATCH)', () => {
    it('should return 401 when no token provided', () => {
      return request(app.getHttpServer())
        .patch('/order/123/status')
        .send({ status: 'COMPLETED' })
        .expect(401);
    });

    it('should return 400 when invalid status provided', async () => {
      const token = jwtService.sign({ farmerId: '123' });

      return request(app.getHttpServer())
        .patch('/order/123/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('should return 404 when order not found', async () => {
      const token = jwtService.sign({ farmerId: '123' });

      return request(app.getHttpServer())
        .patch('/order/999/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'COMPLETED' })
        .expect(404);
    });
  });
}); 