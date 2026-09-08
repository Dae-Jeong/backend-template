import { createApp, listen } from './bootstrap/app.js';
import { readSettings } from './config/settings.js';

async function bootstrap() {
  const settings = readSettings();
  const app = await createApp(settings);
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  await listen(app, settings.port, settings.host);
}
try {
  await bootstrap();
} catch {
  process.stderr.write('{"message":"application.start_failed"}\n');
  process.exitCode = 1;
}
