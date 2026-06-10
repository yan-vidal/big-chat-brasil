import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupOpenApi } from './openapi/openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 3000);
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

  app.enableCors({ origin: corsOrigin });
  setupOpenApi(app);

  await app.listen(port);
}

void bootstrap();
