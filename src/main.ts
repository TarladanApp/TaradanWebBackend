import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('NestJS Uygulamasına İstek Ulaştı.');

  // Global validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false, // Multipart form data için false
    skipMissingProperties: false,
    enableDebugMessages: true,
  }));

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }));

  // CORS ayarları
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://tarladan.app',
      'https://www.tarladan.app',
      'https://api.tarladan.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Tarladan API')
    .setDescription('Tarladan uygulaması için API dokümantasyonu')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
