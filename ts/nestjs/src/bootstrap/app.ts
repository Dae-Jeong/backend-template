import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import type { Settings } from '../config/settings.js';

export function configureApp(app: INestApplication): void {
  app.getHttpAdapter().getInstance().disable('x-powered-by');
}

export async function createApp(settings: Settings): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.register(settings), { logger: false, abortOnError: false });
  try {
    configureApp(app);
    await app.init();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

export async function listen(app: INestApplication, port: number, host: string): Promise<void> {
  try { await app.listen(port, host); }
  catch (error) { await app.close(); throw error; }
}
