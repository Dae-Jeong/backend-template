import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Readiness } from '../bootstrap/readiness.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(Readiness) private readonly readiness: Readiness) {}
  @Get('live')
  live(): { status: string } { return { status: 'alive' }; }
  @Get('ready')
  ready(@Res({ passthrough: true }) response: Response): { status: string } {
    response.status(this.readiness.ready ? 200 : 503);
    return { status: this.readiness.ready ? 'ready' : 'not_ready' };
  }
}
