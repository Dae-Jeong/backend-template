import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Primary } from '../database/primary.js';
import { ReservationsRepository } from '../repositories/reservations.repository.js';
import type { ReservationClient } from '../repositories/reservations.repository.js';
import { DatabaseMetrics } from '../observability/database.metrics.js';
import type { TransactionOutcome } from '../contracts/observation.contract.js';
import { CLOCK } from '../contracts/clock.contract.js';
import type { Clock } from '../contracts/clock.contract.js';
import type { ReservationResult } from '../contracts/reservations.contract.js';
import { DatabaseBusy, isDatabaseBusy } from '../exceptions/database.error.js';

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(Primary) private readonly primary: Primary,
    @Inject(ReservationsRepository)
    private readonly repository: ReservationsRepository,
    @Inject(DatabaseMetrics) private readonly metrics: DatabaseMetrics,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}
  async reserve(productId: string, key: string): Promise<ReservationResult> {
    const started = performance.now();
    let outcome: TransactionOutcome = 'failed';
    let bodyError: unknown;
    try {
      const connection = await this.primary.acquire();
      try {
        const result = await connection.db.transaction(
          async (client) => {
            try {
              return await this.reserveInTransaction(client, productId, key);
            } catch (error) {
              bodyError = error;
              throw error;
            }
          },
          { behavior: 'immediate' },
        );
        outcome = 'committed';
        return result;
      } finally {
        await this.primary.release(connection);
      }
    } catch (error) {
      // Drizzle rethrows the callback error only after rollback succeeds.
      // COMMIT or ROLLBACK failures are different errors and remain 'failed'.
      if (bodyError !== undefined && error === bodyError)
        outcome = 'rolled_back';
      if (isDatabaseBusy(error)) throw new DatabaseBusy();
      throw error;
    } finally {
      this.metrics.transaction(outcome, (performance.now() - started) / 1000);
    }
  }

  private async reserveInTransaction(
    client: ReservationClient,
    productId: string,
    key: string,
  ): Promise<ReservationResult> {
    const existing = await this.repository.replay(client, key, productId);
    if (existing) return { reservation: existing, replayed: true };

    await this.repository.decreaseStock(client, productId);
    const reservation = {
      reservationId: randomUUID().replaceAll('-', ''),
      productId,
      createdAt: this.clock(),
    };
    await this.repository.saveReservation(client, reservation);
    await this.repository.saveIdempotency(client, key, reservation);
    return { reservation, replayed: false };
  }
}
