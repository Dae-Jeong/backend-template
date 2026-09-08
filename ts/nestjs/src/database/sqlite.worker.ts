import { parentPort, workerData } from 'node:worker_threads';
import Database from 'better-sqlite3';
import type { QueryRequest, QueryResponse } from './worker.contract.js';

const { filename, busyTimeoutMs } = workerData as {
  filename: string;
  busyTimeoutMs: number;
};
const database = new Database(filename, {
  timeout: busyTimeoutMs,
  fileMustExist: true,
});
database.pragma('foreign_keys = ON');
database.pragma('synchronous = FULL');
const port = parentPort!;
port.on('message', (query: QueryRequest) => {
  if (query.method === 'close') {
    database.close();
    port.postMessage({
      id: query.id,
      rows: [],
      inTransaction: false,
    } satisfies QueryResponse);
    port.close();
    return;
  }
  try {
    const statement = database.prepare(query.sql);
    let rows: unknown[] = [];
    if (query.method === 'run') statement.run(...query.params);
    else if (query.method === 'get')
      rows =
        (statement.raw().get(...query.params) as unknown[] | undefined) ?? [];
    else rows = statement.raw().all(...query.params);
    port.postMessage({
      id: query.id,
      rows,
      inTransaction: database.inTransaction,
    } satisfies QueryResponse);
  } catch (error) {
    const code =
      error instanceof Error &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'SQLITE_ERROR';
    port.postMessage({
      id: query.id,
      rows: [],
      inTransaction: database.inTransaction,
      errorCode: code,
    } satisfies QueryResponse);
  }
});
