// Ensure Playwright looks in node_modules/.local-browsers on cloud hosts like Render
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Allow Next.js frontend to communicate
  const port = process.env.PORT || 3001;
  
  console.log(`[Bootstrap] Starting server on port ${port}...`);
  console.log(`[Bootstrap] PLAYWRIGHT_BROWSERS_PATH: ${process.env.PLAYWRIGHT_BROWSERS_PATH}`);
  console.log(`[Bootstrap] SMTP EMAIL_USER configured: ${!!process.env.EMAIL_USER}`);
  console.log(`[Bootstrap] LINKEDIN_LI_AT_COOKIE configured: ${!!process.env.LINKEDIN_LI_AT_COOKIE}`);

  await app.listen(port, '0.0.0.0');
}
bootstrap();

