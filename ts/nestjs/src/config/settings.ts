export class Settings {
  constructor(
    readonly host: string,
    readonly port: number,
    readonly environment: string,
    readonly serviceName: string,
    readonly serviceVersion: string,
    readonly logLevel: 'info' | 'debug' | 'warn' | 'error' | 'silent',
    readonly databaseFilename: string | undefined,
    readonly poolSize: number,
    readonly poolTimeoutMs: number,
    readonly busyTimeoutMs: number,
    readonly shutdownTimeoutSeconds: number,
  ) {}
}

export function readSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  const host = env.SERVER_HOST ?? '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0', '::1'].includes(host))
    throw new Error('Invalid SERVER_HOST');
  const integer = (key: string, fallback: number, max: number): number => {
    const value = env[key] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
      throw new Error(`Invalid ${key}`);
    return Number(value);
  };
  const port = integer('SERVER_PORT', 18083, 65535);
  const text = (key: string, fallback: string): string => {
    const value = env[key] ?? fallback;
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(value))
      throw new Error(`Invalid ${key}`);
    return value;
  };
  const level = env.LOG_LEVEL ?? 'info';
  if (!['info', 'debug', 'warn', 'error', 'silent'].includes(level))
    throw new Error('Invalid LOG_LEVEL');
  const url = env.DB_PRIMARY_URL;
  let filename: string | undefined;
  if (url) {
    if (
      !url.startsWith('file:') ||
      url.length <= 5 ||
      /[\r\n\0?#]/.test(url) ||
      url.startsWith('file://') ||
      url === 'file::memory:'
    )
      throw new Error('Invalid DB_PRIMARY_URL');
    filename = url.slice(5);
  }
  return Object.freeze(
    new Settings(
      host,
      port,
      text('APP_ENVIRONMENT', 'local'),
      text('APP_NAME', 'backend-template-nestjs'),
      text('SERVICE_VERSION', '0.0.1'),
      level as Settings['logLevel'],
      filename,
      integer('DB_POOL_SIZE', 2, 8),
      integer('DB_POOL_TIMEOUT_MS', 1000, 60000),
      integer('DB_BUSY_TIMEOUT_MS', 1000, 60000),
      integer('SHUTDOWN_TIMEOUT_SECONDS', 10, 300),
    ),
  );
}
