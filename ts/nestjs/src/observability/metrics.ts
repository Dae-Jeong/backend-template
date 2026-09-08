import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from '@prometheus-io/client';

import type { HttpResult } from '../contracts/observation.contract.js';
const labels = [
  'method',
  'route',
  'status',
  'completion',
  'execution',
] as const;
export const durationBuckets = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
];

@Injectable()
export class Metrics {
  readonly registry = new Registry();
  failed = false;
  readonly requests = new Counter({
    name: 'http_requests_total',
    help: 'HTTP requests by observed outcome.',
    labelNames: labels,
    registers: [this.registry],
  });
  readonly duration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Time to response finish or incomplete transport close.',
    labelNames: labels,
    buckets: durationBuckets,
    registers: [this.registry],
  });
  record(action: () => void): void {
    try {
      action();
    } catch {
      this.failed = true;
    }
  }
  http(result: HttpResult): void {
    const { seconds, status, ...values } = result;
    const serialized = {
      ...values,
      status: status === null ? 'none' : String(status),
    };
    this.record(() => {
      this.requests.inc(serialized);
      this.duration.observe(serialized, seconds);
    });
  }
}
