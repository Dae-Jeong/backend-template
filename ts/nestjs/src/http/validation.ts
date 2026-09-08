import { HttpException, ValidationPipe } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { FieldErrorDto } from '../dto/problem.dto.js';

export class InvalidInput extends HttpException {
  constructor(readonly fields: FieldErrorDto[]) {
    super('Invalid input', 422);
  }
}

function fieldCode(error: ValidationError): string {
  const rules = error.constraints ?? {};
  if ('isDefined' in rules) return 'REQUIRED';
  if ('isString' in rules || 'whitelistValidation' in rules) return 'INVALID';
  if ('minLength' in rules) return 'TOO_SHORT';
  if ('maxLength' in rules) return 'TOO_LONG';
  return 'INVALID';
}

export function inputPipe(
  type: Type<unknown>,
  location: 'query' | 'body' | 'header',
): ValidationPipe {
  return new ValidationPipe({
    expectedType: type,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors: ValidationError[]) =>
      new InvalidInput(
        errors.slice(0, 20).map((error) => ({
          location: {
            query: ['name'],
            body: ['product_id'],
            header: ['Idempotency-Key'],
          }[location].includes(error.property)
            ? [location, error.property]
            : [],
          code: fieldCode(error),
        })),
      ),
  });
}
