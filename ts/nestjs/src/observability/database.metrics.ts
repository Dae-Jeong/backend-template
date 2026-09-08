import { Inject, Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram } from '@prometheus-io/client';
import { Metrics, durationBuckets } from './metrics.js';
import type { TransactionOutcome } from '../contracts/observation.contract.js';

@Injectable()
export class DatabaseMetrics {
  readonly connections: Gauge<'role'>;
  readonly limit: Gauge<'role'>;
  readonly sessions: Gauge<'role'>;
  readonly hold: Histogram<'role'>;
  readonly acquisition: Histogram<'role' | 'outcome'>;
  readonly timeouts: Counter<'role'>;
  readonly transactions: Counter<'role' | 'outcome'>;
  readonly duration: Histogram<'role' | 'outcome'>;
  constructor(@Inject(Metrics) readonly owner: Metrics) {
    const registers = [owner.registry];
    const buckets = [...durationBuckets, 10, 30, 60, 120];
    this.connections = new Gauge({
      name: 'db_pool_connections_in_use',
      help: 'Worker connections checked out.',
      labelNames: ['role'],
      registers,
    });
    this.limit = new Gauge({
      name: 'db_pool_connection_limit',
      help: 'Maximum worker connections.',
      labelNames: ['role'],
      registers,
    });
    this.sessions = new Gauge({
      name: 'db_sessions_active',
      help: 'Connection leases including acquisition wait.',
      labelNames: ['role'],
      registers,
    });
    this.hold = new Histogram({
      name: 'db_pool_connection_hold_seconds',
      help: 'Worker checkout through return.',
      labelNames: ['role'],
      registers,
      buckets,
    });
    this.acquisition = new Histogram({
      name: 'db_connection_acquire_seconds',
      help: 'Worker acquisition including creation and validation.',
      labelNames: ['role', 'outcome'],
      registers,
      buckets,
    });
    this.timeouts = new Counter({
      name: 'db_pool_timeouts_total',
      help: 'Worker pool acquisition timeouts.',
      labelNames: ['role'],
      registers,
    });
    this.timeouts.labels('primary').inc(0);
    this.transactions = new Counter({
      name: 'db_transactions_total',
      help: 'Business transactions after finalization.',
      labelNames: ['role', 'outcome'],
      registers,
    });
    this.duration = new Histogram({
      name: 'db_transaction_duration_seconds',
      help: 'Business transaction duration through commit or rollback.',
      labelNames: ['role', 'outcome'],
      registers,
      buckets,
    });
    for (const outcome of ['committed', 'rolled_back', 'failed']) {
      this.transactions.labels('primary', outcome).inc(0);
    }
  }
  transaction(outcome: TransactionOutcome, seconds: number): void {
    this.owner.record(() => {
      this.transactions.labels('primary', outcome).inc();
      this.duration.labels('primary', outcome).observe(seconds);
    });
  }
}
