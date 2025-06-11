const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const EXPORT_SCRIPT = path.resolve(__dirname, '../engine/kernel_export.js');

function setupEnv(baseDir, opts = {}) {
  const vaultBase = path.join(baseDir, 'vaults');
  const baseKernel = path.join(vaultBase, 'vault_0001_soulfra_kernel');
  fs.mkdirSync(path.join(baseKernel, 'output'), { recursive: true });
  fs.writeFileSync(path.join(baseKernel, 'seal_log.json'), JSON.stringify({ fingerprint: 'abc123' }));

  const vault = path.join(vaultBase, 'vault_0003_referral_system');
  fs.mkdirSync(path.join(vault, 'output'), { recursive: true });
  fs.writeFileSync(path.join(vault, 'output', 'dummy.txt'), 'hello');
  const meta = {
    vault_id: 'vault_0003_referral_system',
    creator: 'tester',
    fingerprint: opts.fingerprint || 'abc123',
  };
  if (opts.referred_by) meta.referred_by = opts.referred_by;
  fs.writeFileSync(path.join(vault, 'metadata.json'), JSON.stringify(meta));
  if (opts.lock) fs.writeFileSync(path.join(vault, '.llm_lock'), '1');

  fs.writeFileSync(path.join(baseDir, 'credits.json'), JSON.stringify({ balance: opts.credits || 100 }));
  fs.mkdirSync(path.join(baseDir, 'admin'), { recursive: true });
  fs.writeFileSync(path.join(baseDir, 'admin', 'export_log.json'), '[]');
  fs.writeFileSync(path.join(baseDir, 'admin', 'buyback_log.json'), '[]');

  return { vault };
}

describe('kernel_export permissions', () => {
  test('valid fingerprint export succeeds', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-valid-'));
    const { vault } = setupEnv(tmp, { referred_by: 'qr_user_001' });
    process.chdir(tmp);
    execSync(`node ${EXPORT_SCRIPT} ${vault}`);
    const expDir = path.join(tmp, 'export');
    const files = fs.readdirSync(expDir).filter(f => f.endsWith('.zip'));
    expect(files.length).toBe(1);
    const logs = JSON.parse(fs.readFileSync(path.join(tmp, 'admin', 'export_log.json')));
    expect(logs.length).toBe(1);
    const credits = JSON.parse(fs.readFileSync(path.join(tmp, 'credits.json')));
    expect(credits.balance).toBe(50);
  });

  test('missing fingerprint fails', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-missing-'));
    const { vault } = setupEnv(tmp, { fingerprint: undefined });
    process.chdir(tmp);
    expect(() => execSync(`node ${EXPORT_SCRIPT} ${vault}`)).toThrow();
  });

  test('insufficient credits fails', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-credit-'));
    const { vault } = setupEnv(tmp, { credits: 10 });
    process.chdir(tmp);
    expect(() => execSync(`node ${EXPORT_SCRIPT} ${vault}`)).toThrow();
  });

  test('LLM lock flag fails', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-lock-'));
    const { vault } = setupEnv(tmp, { lock: true });
    process.chdir(tmp);
    expect(() => execSync(`node ${EXPORT_SCRIPT} ${vault}`)).toThrow();
  });
});
