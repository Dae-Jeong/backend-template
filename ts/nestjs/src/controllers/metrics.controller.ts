import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Metrics } from '../observability/metrics.js';
import { Logging } from '../observability/logging.js';
import { ApiResponse } from '@nestjs/swagger';

@Controller()
export class MetricsController {
  constructor(
    @Inject(Metrics) private readonly metrics: Metrics,
    @Inject(Logging) private readonly logging: Logging,
  ) {}
  @Get('/metrics')
  @ApiResponse({
    status: 200,
    content: { 'text/plain': { schema: { type: 'string' } } },
  })
  @ApiResponse({
    status: 503,
    content: { 'text/plain': { schema: { type: 'string' } } },
  })
  async scrape(@Res() response: Response): Promise<void> {
    if (this.metrics.failed || this.logging.failed) {
      response.status(503).type('text/plain').send('Observation unavailable\n');
      return;
    }
    try {
      response
        .type(this.metrics.registry.contentType)
        .send(await this.metrics.registry.metrics());
    } catch {
      this.metrics.failed = true;
      response.status(503).type('text/plain').send('Observation unavailable\n');
    }
  }
}
