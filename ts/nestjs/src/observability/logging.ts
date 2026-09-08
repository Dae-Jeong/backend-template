import { Inject, Injectable } from '@nestjs/common';
import pino from 'pino';
import type { Logger } from 'pino';
import { Settings } from '../config/settings.js';
import type { HttpResult } from '../contracts/observation.contract.js';

@Injectable()
export class Logging {
  readonly logger: Logger;
  failed = false;
  constructor(@Inject(Settings) private readonly settings: Settings) {
    this.logger = pino({
      level: settings.logLevel,
      base: undefined,
      timestamp: false,
      messageKey: 'message',
      formatters: {
        level: (label) => ({ log: { level: label, logger: 'http' } }),
      },
    });
  }
  http(id: string, result: HttpResult, unexpected: boolean): void {
    const outcome =
      result.completion !== 'complete' ||
      result.execution === 'error' ||
      (result.status !== null && result.status >= 400)
        ? 'failure'
        : result.status === null
          ? 'unknown'
          : 'success';
    const base = {
      '@timestamp': new Date().toISOString(),
      service: {
        name: this.settings.serviceName,
        version: this.settings.serviceVersion,
      },
      app: {
        environment: this.settings.environment,
        log_schema_version: 1,
        work: { id, kind: 'http' },
      },
    };
    try {
      if (unexpected)
        this.logger.error(
          {
            ...base,
            event: { action: 'http.failed', outcome: 'failure' },
            error: { code: 'INTERNAL_ERROR' },
          },
          'http.failed',
        );
      this.logger.info(
        {
          ...base,
          event: {
            action: 'http.completed',
            outcome,
            duration: Math.round(result.seconds * 1e9),
          },
          http: {
            request: { method: result.method },
            response: { status_code: result.status },
            route: result.route,
            completion: result.completion,
            execution: result.execution,
          },
        },
        'http.completed',
      );
    } catch {
      this.failed = true;
    }
  }
}
