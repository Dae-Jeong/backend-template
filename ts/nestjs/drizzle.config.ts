import { defineConfig } from 'drizzle-kit';

const url = process.env.DB_PRIMARY_URL ?? '';
if (
  url &&
  (!url.startsWith('file:') ||
    url.startsWith('file://') ||
    /[\r\n\0?#]/.test(url))
)
  throw new Error('Invalid DB_PRIMARY_URL');
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/models/reservations.schema.ts',
  out: './drizzle',
  dbCredentials: { url: url.slice(5) },
});
