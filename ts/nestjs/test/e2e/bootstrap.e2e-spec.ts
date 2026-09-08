import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { readSettings } from '../../src/config/settings.js';
import { CLOCK } from '../../src/contracts/clock.contract.js';
import { configureApp, createApp, listen } from '../../src/bootstrap/app.js';
import { Readiness } from '../../src/bootstrap/readiness.js';

describe('bootstrap and DI', () => {
  it('overrides clock per app and shares HTTP setup', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readSettings({}))],
    })
      .overrideProvider(CLOCK)
      .useValue(() => new Date('2026-01-01T00:00:00Z'))
      .compile();
    const app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    try {
      const response = await request(app.getHttpServer())
        .get('/v1/greetings?name=Marin')
        .expect(200);
      expect(response.body.data).toEqual({
        message: 'Hello, Marin!',
        generated_at: '2026-01-01T00:00:00.000Z',
      });
      await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200, { status: 'ready' });
    } finally {
      await app.close();
    }
    expect(app.get(Readiness).ready).toBe(false);
    const other = await createApp(readSettings({}));
    try {
      expect(
        (await request(other.getHttpServer()).get('/v1/greetings?name=Marin'))
          .body.data.generated_at,
      ).not.toBe('2026-01-01T00:00:00.000Z');
    } finally {
      await other.close();
    }
  });
  it('closes readiness when listen fails', async () => {
    const owner = await createApp(readSettings({}));
    await listen(owner, 0, '127.0.0.1');
    const app = await createApp(readSettings({}));
    try {
      await expect(
        listen(app, owner.getHttpServer().address().port, '127.0.0.1'),
      ).rejects.toThrow();
      expect(app.get(Readiness).ready).toBe(false);
    } finally {
      await owner.close();
    }
  });
});
