export class Settings {
  constructor(
    readonly host: string,
    readonly port: number,
    readonly environment: string,
    readonly serviceName: string,
    readonly serviceVersion: string,
    readonly logLevel: 'info' | 'debug' | 'warn' | 'error' | 'silent',
  ) {}
}

export function readSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  const host = env.HOST ?? '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0', '::1'].includes(host)) throw new Error('Invalid HOST');
  const port = env.PORT ?? '18083';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid PORT');
  const text = (key: string, fallback: string): string => {
    const value = env[key] ?? fallback;
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(value)) throw new Error(`Invalid ${key}`);
    return value;
  };
  const level = env.LOG_LEVEL ?? 'info';
  if (!['info', 'debug', 'warn', 'error', 'silent'].includes(level)) throw new Error('Invalid LOG_LEVEL');
  return Object.freeze(new Settings(host, Number(port), text('APP_ENVIRONMENT', 'local'), text('SERVICE_NAME', 'backend-template-nestjs'), text('SERVICE_VERSION', '0.0.1'), level as Settings['logLevel']));
}
