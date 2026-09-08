import { fork } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { fixture, seed, state } from '../helpers/database.js';

type WorkerMessage = { phase: string; port: number; used: number };
function message(child: ChildProcess, phase: string): Promise<WorkerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Missing worker phase ${phase}`));
    }, 10000);
    const receive = (value: WorkerMessage) => {
      if (value.phase === phase) {
        cleanup();
        resolve(value);
      }
    };
    const exit = () => {
      cleanup();
      reject(new Error('Worker exited before phase'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.off('message', receive);
      child.off('exit', exit);
    };
    child.on('message', receive);
    child.once('exit', exit);
  });
}
async function stop(
  child: ChildProcess,
  signal: NodeJS.Signals = 'SIGTERM',
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = new Promise<void>((resolve) =>
    child.once('exit', () => resolve()),
  );
  child.kill(signal);
  await exit;
}
function rawReserve(port: number, key = 'key', product_id = 'widget') {
  const body = JSON.stringify({ product_id });
  const req = httpRequest({
    host: '127.0.0.1',
    port,
    path: '/v1/reservations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Idempotency-Key': key,
    },
  });
  const result = new Promise<number | undefined>((resolve) => {
    req.on('response', (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', () => resolve(undefined));
  });
  req.end(body);
  return { req, result };
}

describe('independent processes and response loss', () => {
  let database: Awaited<ReturnType<typeof fixture>>;
  let app: INestApplication;
  let children: ChildProcess[];
  beforeEach(async () => {
    children = [];
    database = await fixture();
    app = await database.app();
    await seed(app);
  });
  afterEach(async () => {
    await Promise.all(children.map((child) => stop(child, 'SIGKILL')));
    await database.close();
  });
  async function start(phase = '') {
    const child = fork('test/helpers/process-worker.mjs', [], {
      env: {
        ...database.env,
        TEST_PHASE: phase,
        SHUTDOWN_TIMEOUT_SECONDS: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    children.push(child);
    const logs: string[] = [];
    child.stdout!.on('data', (chunk) => logs.push(String(chunk)));
    const errors: string[] = [];
    child.stderr!.on('data', (chunk) => errors.push(String(chunk)));
    const ready = await message(child, 'ready');
    return { child, port: ready.port, logs, errors };
  }
  it.each(['before_commit', 'after_commit'])(
    'recovers from SIGKILL %s using persisted state',
    async (phase) => {
      const server = await start(phase);
      const boundary = message(server.child, phase);
      const pending = rawReserve(server.port);
      await boundary;
      await stop(server.child, 'SIGKILL');
      await pending.result;
      expect(await state(app)).toEqual(
        phase === 'before_commit' ? [[1, 0, 0]] : [[0, 1, 1]],
      );
      const restarted = await start();
      const response = await request(`http://127.0.0.1:${restarted.port}`)
        .post('/v1/reservations')
        .set('Idempotency-Key', 'key')
        .send({ product_id: 'widget' })
        .expect(201);
      expect(response.headers['idempotency-replayed']).toBe(
        phase === 'after_commit' ? 'true' : 'false',
      );
      expect(await state(app)).toEqual([[0, 1, 1]]);
      await stop(restarted.child);
    },
  );
  it('replays after response is lost while the process remains alive', async () => {
    const server = await start('after_commit');
    const boundary = message(server.child, 'after_commit');
    const pending = rawReserve(server.port);
    await boundary;
    pending.req.destroy();
    await pending.result;
    server.child.send('continue');
    const response = await request(app.getHttpServer())
      .post('/v1/reservations')
      .set('Idempotency-Key', 'key')
      .send({ product_id: 'widget' })
      .expect(201);
    expect(response.headers['idempotency-replayed']).toBe('true');
    expect(await state(app)).toEqual([[0, 1, 1]]);
    await stop(server.child);
  });
  it.each(['different', 'same', 'conflicting'])(
    'resolves %s keys across independent Node processes',
    async (mode) => {
      if (mode === 'conflicting') await seed(app, 'another');
      const [one, two] = await Promise.all([start(), start()]);
      const results = await Promise.all([
        rawReserve(one.port, 'key').result,
        rawReserve(
          two.port,
          mode === 'different' ? 'other' : 'key',
          mode === 'conflicting' ? 'another' : 'widget',
        ).result,
      ]);
      expect(results.sort()).toEqual(mode === 'same' ? [201, 201] : [201, 409]);
      expect(await state(app)).toEqual([
        [mode === 'conflicting' ? 1 : 0, 1, 1],
      ]);
      await Promise.all([stop(one.child), stop(two.child)]);
    },
  );
  it('drains an active transaction on SIGTERM and releases worker processes', async () => {
    const server = await start('before_commit');
    const boundary = message(server.child, 'before_commit');
    const pending = rawReserve(server.port);
    await boundary;
    const exited = new Promise((resolve) => server.child.once('exit', resolve));
    server.child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(server.child.signalCode).toBeNull();
    server.child.send('continue');
    expect(await pending.result).toBe(201);
    await exited;
    expect(await state(app)).toEqual([[0, 1, 1]]);
  });
  it('closes sockets at the shutdown deadline while allowing the active DB transaction to settle', async () => {
    const server = await start('before_commit');
    const boundary = message(server.child, 'before_commit');
    const pending = rawReserve(server.port);
    await boundary;
    const exited = new Promise((resolve) => server.child.once('exit', resolve));
    server.child.kill('SIGTERM');
    expect(await pending.result).toBeUndefined();
    expect(server.child.signalCode).toBeNull();
    server.child.send('continue');
    await exited;
    expect(await state(app)).toEqual([[0, 1, 1]]);
  });
});
