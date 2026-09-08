import { Injectable } from '@nestjs/common';
import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';
import { observation } from './observation.js';

@Injectable()
export class ExecutionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const state = observation(context.switchToHttp().getResponse());
    return next.handle().pipe(finalize(() => state?.endExecution()));
  }
}
