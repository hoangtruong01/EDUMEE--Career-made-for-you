import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const corsOrigin = configService.get<string>(
    'app.corsOrigin',
    'http://localhost:3000',
  );
  const enableSwagger = configService.get<boolean>('app.enableSwagger', true);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          formAction: [
            "'self'",
            'https://pay-sandbox.sepay.vn',
            'https://pay.sepay.vn',
            'https://sandbox.pay.sepay.vn',
          ],
        },
      },
    }),
  );

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('EDUMEE API')
      .setDescription('EDUMEE - Career made for you API Documentation\n\nThis API provides endpoints for managing users, authentication, and career-related services.')
      .setVersion('1.0.0')
      .setContact('EDUMEE Team', 'https://edumee.com', 'support@edumee.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer(`http://localhost:${port}`, 'Local Development Server')
      .addServer('https://api.edumee.com', 'Production Server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication and authorization endpoints')
      .addTag('Users', 'User management and profile endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        syntaxHighlight: {
          theme: 'nord',
        },
      },
      customSiteTitle: 'EDUMEE API Documentation',
      customfavIcon: '/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    });

    logger.log(
      `📚 Swagger documentation available at http://localhost:${port}/api/docs`,
    );
  }

  await app.listen(port);

  logger.log(`🚀 EDUMEE Backend is running on http://localhost:${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📡 CORS enabled for: ${corsOrigin}`);
  logger.log(`🔒 Swagger Documentation:http://localhost:${port}/api/docs`);
}

void bootstrap();
