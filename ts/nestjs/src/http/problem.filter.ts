import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { InvalidInput } from './validation.js';
import { sendProblem } from './problem.js';
import { observation } from './observation.js';
import {
  ProductNotFound,
  SoldOut,
  IdempotencyConflict,
} from '../exceptions/reservations.error.js';
import {
  DatabaseBusy,
  DatabasePoolTimeout,
  DatabaseDisabled,
} from '../exceptions/database.error.js';

export class PublicHttpError extends HttpException {
  constructor(
    status: number,
    readonly headers: Record<string, string>,
  ) {
    super('HTTP error', status);
  }
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const application =
      error instanceof ProductNotFound
        ? ([404, 'PRODUCT_NOT_FOUND'] as const)
        : error instanceof SoldOut
          ? ([409, 'SOLD_OUT'] as const)
          : error instanceof IdempotencyConflict
            ? ([409, 'IDEMPOTENCY_CONFLICT'] as const)
            : error instanceof DatabaseBusy
              ? ([503, 'DATABASE_BUSY'] as const)
              : error instanceof DatabasePoolTimeout
                ? ([503, 'DATABASE_POOL_TIMEOUT'] as const)
                : error instanceof DatabaseDisabled
                  ? ([503, 'HTTP_ERROR'] as const)
                  : undefined;
    if (application) {
      observation(response)?.endExecution();
      sendProblem(
        response,
        application[0],
        application[1],
        undefined,
        application[0] === 503 ? { 'Retry-After': '1' } : {},
      );
      return;
    }
    const parserFailure =
      error instanceof Error &&
      'type' in error &&
      error.type === 'entity.parse.failed';
    let status = error instanceof HttpException ? error.getStatus() : 500;
    if (parserFailure) status = 422;
    if (status < 400 || status > 599) status = 500;
    const code =
      (
        {
          404: 'NOT_FOUND',
          405: 'METHOD_NOT_ALLOWED',
          422: 'INVALID_INPUT',
        } as Record<number, string>
      )[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR');
    observation(response)?.endExecution(status >= 500);
    sendProblem(
      response,
      status,
      code,
      error instanceof InvalidInput
        ? error.fields
        : parserFailure
          ? [{ location: [], code: 'INVALID' }]
          : undefined,
      error instanceof PublicHttpError ? error.headers : {},
    );
  }
}
