import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CollectorService } from './collector.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const collector = app.get(CollectorService);
  const result = await collector.collectData(3);
  console.log('RESULT:', JSON.stringify(result, null, 2));
  await app.close();
}
bootstrap();
