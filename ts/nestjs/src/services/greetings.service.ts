import { Inject, Injectable } from '@nestjs/common';
import { CLOCK } from '../contracts/clock.contract.js';
import type { Clock } from '../contracts/clock.contract.js';
import type { Greeting } from '../contracts/greetings.contract.js';

@Injectable()
export class GreetingsService {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}
  greet(name: string): Greeting { return { message: `Hello, ${name}!`, generatedAt: this.clock() }; }
}
