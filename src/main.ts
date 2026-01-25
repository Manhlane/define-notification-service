import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildRabbitMqOptions } from './notifications/rabbitmq.provider';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const logger = new Logger('Bootstrap');

  const corsOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Define Notifications API')
    .setDescription('Queue notification jobs for downstream delivery workers.')
    .setVersion('1.0.0')
    .addTag('notifications')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const rmqOptions = buildRabbitMqOptions();
  app.connectMicroservice<MicroserviceOptions>(rmqOptions);
  await app.startAllMicroservices();

  const port = Number(process.env.PORT ?? 3005);
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`CORS enabled for: ${corsOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error.stack);
  process.exitCode = 1;
});
