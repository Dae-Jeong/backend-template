import { STATUS_CODES } from 'node:http';
import type { Response } from 'express';
import type { FieldErrorDto } from '../dto/problem.dto.js';

export function sendProblem(
  response: Response,
  status: number,
  code: string,
  fields?: FieldErrorDto[],
  headers: Record<string, string> = {},
): void {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (
      !['content-type', 'content-length', 'x-request-id'].includes(
        key.toLowerCase(),
      )
    )
      response.setHeader(key, value);
  }
  response
    .status(status)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'HTTP Error',
      status,
      code,
      request_id: response.getHeader('X-Request-ID'),
      ...(fields ? { errors: fields } : {}),
    });
}
