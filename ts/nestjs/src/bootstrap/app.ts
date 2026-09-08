import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import type { Settings } from '../config/settings.js';
import { Metrics } from '../observability/metrics.js';
import { Logging } from '../observability/logging.js';
import { configureOpenApi } from '../http/openapi.js';
import { observeHttp, observation } from '../http/observation.js';
import { sendProblem } from '../http/problem.js';
import type { Request, Response, NextFunction } from 'express';
import type { ExpressAdapter } from '@nestjs/platform-express';

export function configureApp(app: INestApplication): void {
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const { routes, install } = configureOpenApi(app);
  app.use(observeHttp(app.get(Metrics), app.get(Logging), routes));
  app.use((request: Request, response: Response, next: NextFunction) => {
    const allowed = routes.get(request.path);
    if (allowed && !allowed.includes(request.method)) {
      observation(response)?.endExecution();
      sendProblem(response, 405, 'METHOD_NOT_ALLOWED', undefined, {
        Allow: allowed.join(', '),
      });
    } else next();
  });
  (app.getHttpAdapter() as ExpressAdapter).useBodyParser('json', false, {
    limit: '100kb',
  });
  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (
        error instanceof Error &&
        'type' in error &&
        error.type === 'entity.parse.failed'
      ) {
        observation(response)?.endExecution();
        sendProblem(response, 422, 'INVALID_INPUT', [
          { location: [], code: 'INVALID' },
        ]);
      } else next(error);
    },
  );
  install();
}

export async function createApp(settings: Settings): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.register(settings), {
    logger: false,
    abortOnError: false,
  });
  try {
    configureApp(app);
    await app.init();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

export async function listen(
  app: INestApplication,
  port: number,
  host: string,
): Promise<void> {
  try {
    await app.listen(port, host);
  } catch (error) {
    await app.close();
    throw error;
  }
}
