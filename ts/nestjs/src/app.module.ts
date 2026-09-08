import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { Settings } from './config/settings.js';
import { Readiness } from './bootstrap/readiness.js';
import { clockProvider } from './providers/clock.provider.js';
import { GreetingsController } from './controllers/greetings.controller.js';
import { GreetingsService } from './services/greetings.service.js';
import { HealthController } from './controllers/health.controller.js';

@Module({
  imports: [],
  controllers: [GreetingsController, HealthController],
  providers: [GreetingsService, clockProvider, Readiness],
})
export class AppModule {
  static register(settings: Settings): DynamicModule {
    return { module: AppModule, providers: [{ provide: Settings, useValue: settings }] };
  }
}
