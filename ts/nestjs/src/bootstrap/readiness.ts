import { Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class Readiness implements OnApplicationBootstrap, OnModuleDestroy {
  ready = false;
  onApplicationBootstrap(): void { this.ready = true; }
  onModuleDestroy(): void { this.ready = false; }
}
