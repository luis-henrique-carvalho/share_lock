/* eslint-disable @typescript-eslint/no-floating-promises */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DrizzleExceptionFilter } from './common/filters/drizzle-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: ['verbose'],
  });
  const port = process.env.PORT ?? 3000;

  app.useGlobalFilters(new DrizzleExceptionFilter(), new HttpExceptionFilter());

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  await app.listen(port);
}
bootstrap();
