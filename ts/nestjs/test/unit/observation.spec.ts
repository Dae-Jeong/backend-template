import type { Response } from 'express';
import { Observation } from '../../src/http/observation.js';
import { Metrics } from '../../src/observability/metrics.js';
import { Logging } from '../../src/observability/logging.js';
import { readSettings } from '../../src/config/settings.js';

describe('observation completion semantics', () => {
  it('waits for execution after disconnect and records close exactly once', async () => {
    const metrics = new Metrics();
    const logging = new Logging(readSettings({ LOG_LEVEL: 'silent' }));
    const log = vi.spyOn(logging.logger, 'info');
    const observation = new Observation(
      'request',
      'GET',
      '/v1/reservations',
      false,
      metrics,
      logging,
    );
    observation.endTransport(
      { headersSent: false, statusCode: 200 } as Response,
      false,
    );
    expect((await metrics.requests.get()).values).toHaveLength(0);
    observation.endExecution();
    observation.endTransport({ headersSent: false } as Response, false);
    const values = (await metrics.requests.get()).values;
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({
      value: 1,
      labels: {
        status: 'none',
        execution: 'returned',
        completion: 'disconnected',
      },
    });
    expect(log.mock.calls[0][0]).toMatchObject({
      http: { response: { status_code: null } },
    });
  });
  it('keeps numeric status internally and serializes only the metric boundary', async () => {
    const metrics = new Metrics();
    const other = new Metrics();
    const logging = new Logging(readSettings({ LOG_LEVEL: 'silent' }));
    const log = vi.spyOn(logging.logger, 'info');
    const observation = new Observation(
      'request',
      'PRIVATE_METHOD',
      'unmatched',
      false,
      metrics,
      logging,
    );
    observation.endExecution(true);
    observation.endTransport(
      { headersSent: true, statusCode: 500 } as Response,
      true,
    );
    expect(log.mock.calls[0][0]).toMatchObject({
      http: { request: { method: 'OTHER' }, response: { status_code: 500 } },
    });
    expect((await metrics.requests.get()).values[0]).toMatchObject({
      labels: {
        method: 'OTHER',
        status: '500',
        completion: 'complete',
        execution: 'error',
      },
    });
    expect((await other.requests.get()).values).toHaveLength(0);
  });
});
