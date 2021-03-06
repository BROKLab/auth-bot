import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  // app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.use(helmet());
  console.log('Current .env', process.env.NODE_ENV);
  await app.listen(process.env.PORT || 3002);
}
bootstrap();
