import { createApp, listen } from '../../dist/bootstrap/app.js';
import { readSettings } from '../../dist/config/settings.js';
import { Primary } from '../../dist/database/primary.js';
import { Connection } from '../../dist/database/connection.js';

const phase = process.env.TEST_PHASE;
const query = Connection.prototype.query;
Connection.prototype.query = async function (sql, params, method) {
  const isCommit = sql.trim().toLowerCase() === 'commit';
  if (isCommit && phase === 'before_commit') {
    process.send({ phase });
    await new Promise((resolve) => process.once('message', resolve));
  }
  const result = await query.call(this, sql, params, method);
  if (isCommit && phase === 'after_commit') {
    process.send({ phase });
    await new Promise((resolve) => process.once('message', resolve));
  }
  return result;
};
const app = await createApp(readSettings());
app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
await listen(app, 0, '127.0.0.1');
process.send({ phase: 'ready', port: app.getHttpServer().address().port });
process.on('message', (message) => {
  if (message === 'close') void app.close().then(() => process.disconnect());
  if (message === 'pool')
    process.send({ phase: 'pool', used: app.get(Primary).pool.numUsed() });
});
