import { Inject, Injectable } from '@nestjs/common';
import type {
  BeforeApplicationShutdown,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Server } from 'node:http';
import { Settings } from '../config/settings.js';

@Injectable()
export class Shutdown
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private timer?: NodeJS.Timeout;
  constructor(
    @Inject(Settings) private readonly settings: Settings,
    @Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost,
  ) {}
  beforeApplicationShutdown(): void {
    const server = this.adapter.httpAdapter?.getHttpServer() as
      Server | undefined;
    if (!server) return;
    this.timer = setTimeout(
      () => server.closeAllConnections(),
      this.settings.shutdownTimeoutSeconds * 1000,
    );
    this.timer.unref();
  }
  onApplicationShutdown(): void {
    clearTimeout(this.timer);
  }
}
