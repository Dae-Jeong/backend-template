import { Controller, Get, HttpCode, Res, StreamableFile } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/app.js';
import { readSettings } from '../../src/config/settings.js';
import { PublicHttpError } from '../../src/http/problem.filter.js';
import { Metrics } from '../../src/observability/metrics.js';
import { Logging } from '../../src/observability/logging.js';

@Controller('test')
class TestController {
  @Get('items/:id')
  item(): { data: { found: boolean } } {
    return { data: { found: true } };
  }
  @Get('error') error(): never {
    throw new Error('private-error');
  }
  @Get('no-content') @HttpCode(204) empty(): void {}
  @Get('limited') limited(): never {
    throw new PublicHttpError(429, {
      'Retry-After': '3',
      'Content-Type': 'text/html',
      'Content-Length': '1',
      'X-Request-ID': 'private',
    });
  }
  @Get('stream') stream(): StreamableFile {
    return new StreamableFile(Readable.from(['first', 'second']), {
      type: 'text/plain',
    });
  }
  @Get('stream-failed') async streamFailed(
    @Res() response: Response,
  ): Promise<void> {
    response.write('first');
    await new Promise((resolve) => setTimeout(resolve, 5));
    throw new Error('private-stream');
  }
}

describe('HTTP contract', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readSettings({ LOG_LEVEL: 'silent' }))],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });
  it.each([
    ['/v1/greetings', 422, 'INVALID_INPUT', 'REQUIRED'],
    ['/v1/greetings?name=%20', 422, 'INVALID_INPUT', 'TOO_SHORT'],
    [
      '/v1/greetings?name=' + 'private'.repeat(20),
      422,
      'INVALID_INPUT',
      'TOO_LONG',
    ],
    ['/private-path?token=private-token', 404, 'NOT_FOUND', undefined],
    ['/test/error', 500, 'INTERNAL_ERROR', undefined],
  ])('sanitizes %s', async (path, status, code, field) => {
    const response = await request(app.getHttpServer())
      .get(path)
      .set('X-Request-ID', 'private-id')
      .expect(status);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.body.code).toBe(code);
    expect(response.body.request_id).toMatch(/^[a-f0-9]{32}$/);
    expect(response.headers['x-request-id']).toBe(response.body.request_id);
    expect(response.text).not.toContain('private');
    if (field)
      expect(response.body.errors).toEqual([
        { location: ['query', 'name'], code: field },
      ]);
    else expect(response.body).not.toHaveProperty('errors');
  });
  it('preserves Allow and rejects unsupported HEAD too', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/greetings')
      .expect(405);
    expect(response.headers.allow).toBe('GET');
    expect(response.body.code).toBe('METHOD_NOT_ALLOWED');
    await request(app.getHttpServer()).head('/v1/greetings').expect(405);
  });
  it('normalizes malformed JSON before DTO validation', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/greetings')
      .set('Content-Type', 'application/json')
      .send('{"private":')
      .expect(422);
    expect(response.body.errors).toEqual([{ location: [], code: 'INVALID' }]);
    expect(response.text).not.toContain('private');
  });
  it('retains special responses and meaningful headers', async () => {
    await request(app.getHttpServer()).get('/test/no-content').expect(204, '');
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200, { status: 'alive' });
    const stream = await request(app.getHttpServer())
      .get('/test/stream')
      .expect(200);
    expect(stream.text).toBe('firstsecond');
    const limited = await request(app.getHttpServer())
      .get('/test/limited')
      .expect(429);
    expect(limited.headers['retry-after']).toBe('3');
    expect(limited.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(Number(limited.headers['content-length'])).toBe(
      Buffer.byteLength(limited.text),
    );
    await expect(
      request(app.getHttpServer()).get('/test/stream-failed'),
    ).rejects.toThrow();
  });
  it('documents actual DTO envelopes, problems, and docs request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/openapi.json')
      .expect(200);
    expect(response.headers['x-request-id']).toMatch(/^[a-f0-9]{32}$/);
    const schema = response.body;
    const responses = schema.paths['/v1/greetings'].get.responses;
    expect(responses['200'].content['application/json'].schema.$ref).toContain(
      'GreetingResponseDto',
    );
    for (const status of ['404', '405', '422', '500'])
      expect(Object.keys(responses[status].content)).toEqual([
        'application/problem+json',
      ]);
    expect(
      schema.components.schemas.GreetingResponseDto.properties,
    ).toHaveProperty('data');
  });
  it('counts once, excludes infrastructure paths and bounds route labels', async () => {
    await request(app.getHttpServer())
      .get('/v1/greetings?name=private')
      .expect(200);
    await request(app.getHttpServer()).get('/private-route').expect(404);
    await request(app.getHttpServer()).get('/health/live').expect(200);
    const metrics = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);
    const values = (await app.get(Metrics).requests.get()).values;
    expect(
      values.find(
        (value) =>
          'route' in value.labels && value.labels.route === '/v1/greetings',
      ),
    ).toMatchObject({
      value: 1,
      labels: { status: '200', completion: 'complete', execution: 'returned' },
    });
    expect(metrics.text).toContain('route="unmatched"');
    expect(metrics.text).not.toContain('private');
    expect(metrics.text).not.toContain('route="/health/live"');
  });
  it('uses the registered parameter template for distinct resource IDs', async () => {
    await request(app.getHttpServer()).get('/test/items/private-1').expect(200);
    await request(app.getHttpServer()).get('/test/items/private-2').expect(200);
    const values = (await app.get(Metrics).requests.get()).values;
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({
      value: 2,
      labels: { route: '/test/items/:id' },
    });
    const metrics = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);
    expect(metrics.text).not.toContain('private-');
  });
  it('keeps the original response when recording fails and exposes the failure', async () => {
    vi.spyOn(app.get(Metrics).requests, 'inc').mockImplementation(() => {
      throw new Error('private');
    });
    await request(app.getHttpServer()).get('/').expect(200);
    await request(app.getHttpServer()).get('/metrics').expect(503);
    expect(app.get(Metrics).failed).toBe(true);
  });
  it('keeps the original response when logger fails', async () => {
    vi.spyOn(app.get(Logging).logger, 'info').mockImplementation(() => {
      throw new Error('private');
    });
    await request(app.getHttpServer()).get('/').expect(200);
    await request(app.getHttpServer()).get('/metrics').expect(503);
  });
});
