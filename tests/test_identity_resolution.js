const fs = require('fs');
const path = require('path');
const { generateFingerprint, persistIdentity } = require('../identity/fingerprint');

describe('identity fingerprint', () => {
  const logPath = path.resolve('admin/soft_id_log.json');
  afterEach(() => {
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
  });

  test('fingerprint persists for same session', () => {
    const a = generateFingerprint('test-session');
    const b = generateFingerprint('test-session');
    expect(a.identity_id).toBe(b.identity_id);
  });

  test('persistIdentity writes to log', () => {
    const id = generateFingerprint('log-session');
    persistIdentity(id, 'test action');
    const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    expect(log.pop().identity_id).toBe(id.identity_id);
  });
});
