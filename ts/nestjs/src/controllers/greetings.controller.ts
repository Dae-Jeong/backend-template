import { Controller, Get, Inject, Query } from '@nestjs/common';
import { GreetingsService } from '../services/greetings.service.js';

@Controller()
export class GreetingsController {
  constructor(@Inject(GreetingsService) private readonly greetings: GreetingsService) {}
  @Get('/')
  index(): { data: { message: string } } { return { data: { message: 'Hello, NestJS!' } }; }
  @Get('/v1/greetings')
  greet(@Query('name') name: string): { data: { message: string; generated_at: string } } {
    const result = this.greetings.greet(name);
    return { data: { message: result.message, generated_at: result.generatedAt.toISOString() } };
  }
}
