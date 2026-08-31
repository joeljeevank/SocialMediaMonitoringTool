import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Allow Next.js frontend to communicate
  await app.listen(3001); // Run backend on 3001, since Next.js is 3000
}
bootstrap();
