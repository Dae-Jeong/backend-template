import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { INestApplication } from '@nestjs/common';
import { readSettings } from '../../src/config/settings.js';
import { createApp } from '../../src/bootstrap/app.js';
import { Primary } from '../../src/database/primary.js';
import { ReservationsRepository } from '../../src/repositories/reservations.repository.js';

export const execute = promisify(execFile);
export async function fixture(overrides: NodeJS.ProcessEnv = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'nestjs-reservations-'));
  const filename = join(directory, 'primary.db');
  const env = {
    ...process.env,
    DB_PRIMARY_URL: `file:${filename}`,
    LOG_LEVEL: 'silent',
    ...overrides,
  };
  const migrate = () =>
    execute(process.execPath, ['node_modules/drizzle-kit/bin.cjs', 'migrate'], {
      env,
    });
  await migrate();
  const settings = readSettings(env);
  const apps: INestApplication[] = [];
  return {
    directory,
    filename,
    env,
    settings,
    migrate,
    async app() {
      const app = await createApp(settings);
      apps.push(app);
      return app;
    },
    async close() {
      await Promise.all(apps.map((app) => app.close()));
      await rm(directory, { recursive: true, force: true });
    },
  };
}
export async function seed(
  app: INestApplication,
  id = 'widget',
  stock = 1,
): Promise<void> {
  const primary = app.get(Primary);
  const connection = await primary.acquire();
  try {
    await connection.db.transaction(
      (client) => app.get(ReservationsRepository).seed(client, id, stock),
      { behavior: 'immediate' },
    );
  } finally {
    await primary.release(connection);
  }
}
export async function state(app: INestApplication): Promise<unknown[][]> {
  const primary = app.get(Primary);
  const connection = await primary.acquire();
  try {
    return (
      await connection.query(
        'select (select sum(available) from products), (select count(*) from reservations), (select count(*) from idempotency_keys)',
        [],
        'all',
      )
    ).rows as unknown[][];
  } finally {
    await primary.release(connection);
  }
}
