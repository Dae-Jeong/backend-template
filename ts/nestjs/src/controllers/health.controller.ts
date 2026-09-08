import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Readiness } from '../bootstrap/readiness.js';
import { ApiResponse } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
  constructor(@Inject(Readiness) private readonly readiness: Readiness) {}
  @Get('live')
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['alive'] } },
      required: ['status'],
    },
  })
  live(): { status: string } {
    return { status: 'alive' };
  }
  @Get('ready')
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ready'] } },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 503,
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['not_ready'] } },
      required: ['status'],
    },
  })
  ready(@Res({ passthrough: true }) response: Response): { status: string } {
    response.status(this.readiness.ready ? 200 : 503);
    return { status: this.readiness.ready ? 'ready' : 'not_ready' };
  }
}
