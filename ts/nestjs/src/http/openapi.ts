import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  DocumentBuilder,
  getSchemaPath,
  SwaggerModule,
} from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { ProblemDto } from '../dto/problem.dto.js';

export function ApiProblems(
  ...statuses: number[]
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ProblemDto),
    ...[404, 405, 422, 500, ...statuses].map((status) =>
      ApiResponse({
        status,
        content: {
          'application/problem+json': {
            schema: { $ref: getSchemaPath(ProblemDto) },
          },
        },
        ...(status === 405
          ? { headers: { Allow: { schema: { type: 'string' } } } }
          : status === 503
            ? { headers: { 'Retry-After': { schema: { type: 'string' } } } }
            : {}),
      }),
    ),
  );
}

export function configureOpenApi(app: INestApplication): {
  routes: ReadonlyMap<string, readonly string[]>;
  install: () => void;
} {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Backend Template — NestJS')
      .setVersion('1')
      .build(),
  );
  return {
    install: () =>
      SwaggerModule.setup('/docs', app, document, {
        jsonDocumentUrl: '/openapi.json',
      }),
    routes: new Map(
      Object.entries(document.paths).map(([path, methods]) => [
        path,
        Object.keys(methods)
          .filter((method) =>
            [
              'get',
              'post',
              'put',
              'patch',
              'delete',
              'options',
              'head',
            ].includes(method),
          )
          .map((method) => method.toUpperCase()),
      ]),
    ),
  };
}
