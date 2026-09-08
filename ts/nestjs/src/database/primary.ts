import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { Pool, TimeoutError } from 'tarn';
import { Settings } from '../config/settings.js';
import { DatabaseMetrics } from '../observability/database.metrics.js';
import {
  DatabaseDisabled,
  DatabasePoolTimeout,
} from '../exceptions/database.error.js';
import { Connection } from './connection.js';

@Injectable()
export class Primary implements OnModuleInit, OnApplicationShutdown {
  pool?: Pool<Connection>;
  private readonly held = new Map<Connection, number>();
  constructor(
    @Inject(Settings) private readonly settings: Settings,
    @Inject(DatabaseMetrics) private readonly metrics: DatabaseMetrics,
  ) {}
  async onModuleInit(): Promise<void> {
    const filename = this.settings.databaseFilename;
    if (!filename) return;
    this.pool = new Pool({
      min: 0,
      max: this.settings.poolSize,
      acquireTimeoutMillis: this.settings.poolTimeoutMs,
      createTimeoutMillis: this.settings.poolTimeoutMs,
      destroyTimeoutMillis: this.settings.busyTimeoutMs + 2000,
      propagateCreateError: true,
      create: async () => {
        const connection = new Connection(
          filename,
          this.settings.busyTimeoutMs,
        );
        try {
          await connection.query('select id from products limit 1', [], 'all');
          return connection;
        } catch (error) {
          await connection.close();
          throw error;
        }
      },
      validate: (connection) => connection.alive && !connection.inTransaction,
      destroy: (connection) => connection.close(),
    });
    this.metrics.owner.record(() =>
      this.metrics.limit.labels('primary').set(this.settings.poolSize),
    );
    try {
      const connection = await this.acquire();
      try {
        await connection.query('pragma journal_mode = WAL', [], 'all');
      } finally {
        await this.release(connection);
      }
    } catch (error) {
      await this.pool.destroy();
      throw error;
    }
  }
  async acquire(): Promise<Connection> {
    if (!this.pool) throw new DatabaseDisabled();
    const started = performance.now();
    this.metrics.owner.record(() =>
      this.metrics.sessions.labels('primary').inc(),
    );
    try {
      const connection = await this.pool.acquire().promise;
      this.held.set(connection, performance.now());
      this.metrics.owner.record(() => {
        this.metrics.connections.labels('primary').inc();
        this.metrics.acquisition
          .labels('primary', 'acquired')
          .observe((performance.now() - started) / 1000);
      });
      return connection;
    } catch (error) {
      this.metrics.owner.record(() => {
        this.metrics.sessions.labels('primary').dec();
        this.metrics.acquisition
          .labels(
            'primary',
            error instanceof TimeoutError ? 'timeout' : 'failed',
          )
          .observe((performance.now() - started) / 1000);
        if (error instanceof TimeoutError)
          this.metrics.timeouts.labels('primary').inc();
      });
      if (error instanceof TimeoutError) throw new DatabasePoolTimeout();
      throw error;
    }
  }
  async release(connection: Connection): Promise<void> {
    const started = this.held.get(connection);
    if (started === undefined) throw new Error('Connection is not leased');
    // Never return a live transaction to another request, including failed rollback.
    if (connection.inTransaction) await connection.close();
    this.held.delete(connection);
    this.pool!.release(connection);
    this.metrics.owner.record(() => {
      this.metrics.connections.labels('primary').dec();
      this.metrics.sessions.labels('primary').dec();
      this.metrics.hold
        .labels('primary')
        .observe((performance.now() - started) / 1000);
    });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.pool?.destroy();
  }
}
