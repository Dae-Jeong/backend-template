import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { readSettings } from '../config/settings.js';
import { Primary } from './primary.js';
import { ReservationsRepository } from '../repositories/reservations.repository.js';

const [productId, quantity] = process.argv.slice(2);
if (
  !productId ||
  !/^[A-Za-z0-9._:-]{1,64}$/.test(productId) ||
  !quantity ||
  !/^\d+$/.test(quantity) ||
  !Number.isSafeInteger(Number(quantity))
) {
  process.stderr.write('Usage: pnpm db:seed PRODUCT_ID NONNEGATIVE_STOCK\n');
  process.exitCode = 1;
} else {
  const app = await NestFactory.createApplicationContext(
    AppModule.register(readSettings()),
    { logger: false, abortOnError: false },
  );
  try {
    const primary = app.get(Primary);
    const connection = await primary.acquire();
    try {
      await connection.db.transaction(
        (client) =>
          app
            .get(ReservationsRepository)
            .seed(client, productId, Number(quantity)),
        { behavior: 'immediate' },
      );
    } finally {
      await primary.release(connection);
    }
  } finally {
    await app.close();
  }
}
