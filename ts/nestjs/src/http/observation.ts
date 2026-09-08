import { randomUUID } from 'node:crypto';
import { METHODS } from 'node:http';
import type { Request, Response, NextFunction } from 'express';
import type { Metrics } from '../observability/metrics.js';
import type {
  HttpResult,
  HttpCompletion,
  HttpExecution,
} from '../contracts/observation.contract.js';
import type { Logging } from '../observability/logging.js';

export class Observation {
  execution: HttpExecution | 'pending' = 'pending';
  unexpected = false;
  private terminal?: {
    completion: HttpCompletion;
    seconds: number;
    status: number | null;
  };
  private recorded = false;
  private readonly started = performance.now();
  constructor(
    readonly id: string,
    private readonly method: string,
    private route: string,
    private readonly excluded: boolean,
    private readonly metrics: Metrics,
    private readonly logging: Logging,
  ) {}
  setRouteTemplate(template: unknown): void {
    if (typeof template === 'string') this.route = template;
  }
  endExecution(unexpected = false): void {
    this.unexpected ||= unexpected;
    this.execution = this.unexpected ? 'error' : 'returned';
    this.record();
  }
  endTransport(response: Response, complete: boolean): void {
    this.terminal ??= {
      completion: complete ? 'complete' : 'disconnected',
      seconds: Math.max(0, (performance.now() - this.started) / 1000),
      status: response.headersSent ? response.statusCode : null,
    };
    this.record();
  }
  private record(): void {
    if (this.recorded || !this.terminal || this.execution === 'pending') return;
    this.recorded = true;
    if (this.excluded) return;
    const result: HttpResult = {
      method: METHODS.includes(this.method) ? this.method : 'OTHER',
      route: this.route,
      ...this.terminal,
      execution: this.execution,
    };
    this.metrics.http(result);
    this.logging.http(this.id, result, this.unexpected);
  }
}
const states = new WeakMap<Response, Observation>();
export function observation(response: Response): Observation | undefined {
  return states.get(response);
}

export function observeHttp(
  metrics: Metrics,
  logging: Logging,
  routes: ReadonlyMap<string, readonly string[]>,
) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const id = randomUUID().replaceAll('-', '');
    response.setHeader('X-Request-ID', id);
    const path = request.path;
    const excluded =
      path === '/metrics' ||
      path.startsWith('/health/') ||
      path === '/openapi.json' ||
      path === '/docs' ||
      path.startsWith('/docs/');
    const state = new Observation(
      id,
      request.method,
      routes.has(path) ? path : 'unmatched',
      excluded,
      metrics,
      logging,
    );
    states.set(response, state);
    const endTransport = (complete: boolean) => {
      // Express public req.route.path is the registered template, never the URL.
      const route = request.route as { path?: unknown } | undefined;
      state.setRouteTemplate(route?.path);
      state.endTransport(response, complete);
    };
    response.once('finish', () => endTransport(true));
    response.once('close', () => endTransport(response.writableFinished));
    response.once('error', () => state.endExecution(true));
    if (excluded) state.endExecution();
    next();
  };
}
