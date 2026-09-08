import { readSettings } from '../../src/config/settings.js';
describe('settings', () => {
  it('uses isolated validated defaults', () => {
    expect(readSettings({}).port).toBe(18083);
  });
  it.each(['0', '-1', '65536', '', '1.5', 'secret'])(
    'rejects port %s without echoing input',
    (PORT) => {
      expect(() => readSettings({ SERVER_PORT: PORT })).toThrow(
        'Invalid SERVER_PORT',
      );
    },
  );
  it('rejects invalid names and levels', () => {
    expect(() => readSettings({ APP_NAME: 'private\nvalue' })).toThrow(
      'Invalid APP_NAME',
    );
    expect(() => readSettings({ LOG_LEVEL: 'private' })).toThrow(
      'Invalid LOG_LEVEL',
    );
  });
});
