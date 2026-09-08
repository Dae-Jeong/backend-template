import { readSettings } from '../../src/config/settings.js';
describe('settings', () => {
  it('uses isolated validated defaults', () => { expect(readSettings({}).port).toBe(18083); });
  it.each(['0', '-1', '65536', '', '1.5', 'secret'])('rejects port %s without echoing input', (PORT) => {
    expect(() => readSettings({ PORT })).toThrow('Invalid PORT');
  });
  it('rejects invalid names and levels', () => {
    expect(() => readSettings({ SERVICE_NAME: 'private\nvalue' })).toThrow('Invalid SERVICE_NAME');
    expect(() => readSettings({ LOG_LEVEL: 'private' })).toThrow('Invalid LOG_LEVEL');
  });
});
