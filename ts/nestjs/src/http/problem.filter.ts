import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { InvalidInput, isParserFailure } from './validation.js';
import type { FieldErrorDto } from '../dto/problem.dto.js';
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
    const problem = classifyProblem(error);
    observation(response)?.endExecution(problem.executionFailed);
    sendProblem(
      response,
      problem.status,
      problem.code,
      problem.fields,
      problem.headers,
    );
  }
}

type Problem = {
  status: number;
  code: string;
  fields?: FieldErrorDto[];
  headers?: Record<string, string>;
  executionFailed: boolean;
};

function applicationProblem(error: unknown): [number, string] | undefined {
  if (error instanceof ProductNotFound) return [404, 'PRODUCT_NOT_FOUND'];
  if (error instanceof SoldOut) return [409, 'SOLD_OUT'];
  if (error instanceof IdempotencyConflict)
    return [409, 'IDEMPOTENCY_CONFLICT'];
  if (error instanceof DatabaseBusy) return [503, 'DATABASE_BUSY'];
  if (error instanceof DatabasePoolTimeout)
    return [503, 'DATABASE_POOL_TIMEOUT'];
  if (error instanceof DatabaseDisabled) return [503, 'HTTP_ERROR'];
  return undefined;
}

function classifyProblem(error: unknown): Problem {
  const application = applicationProblem(error);
  if (application) {
    const [status, code] = application;
    return {
      status,
      code,
      headers: status === 503 ? { 'Retry-After': '1' } : undefined,
      // Recognized application failures are handled execution outcomes, even at 503.
      executionFailed: false,
    };
  }

  const parserFailure = isParserFailure(error);
  let status = error instanceof HttpException ? error.getStatus() : 500;
  if (parserFailure) status = 422;
  if (status < 400 || status > 599) status = 500;
  let fields: FieldErrorDto[] | undefined;
  if (error instanceof InvalidInput) fields = error.fields;
  else if (parserFailure) fields = [{ location: [], code: 'INVALID' }];
  return {
    status,
    code: httpCode(status),
    fields,
    headers: error instanceof PublicHttpError ? error.headers : undefined,
    executionFailed: status >= 500,
  };
}

function httpCode(status: number): string {
  switch (status) {
    case 404:
      return 'NOT_FOUND';
    case 405:
      return 'METHOD_NOT_ALLOWED';
    case 422:
      return 'INVALID_INPUT';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR';
  }
}
