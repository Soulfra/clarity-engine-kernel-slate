const fs = require('fs');
const path = require('path');
const os = require('os');
const referral = require('../auth/referral_manager');
const forkVault = require('../vault_forker');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'referral-test-'));
}

describe('Referral System', () => {
  let cwd;
  let tempDir;

  beforeEach(() => {
    cwd = process.cwd();
    tempDir = tmp();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('referral persists through fork and credits logged', () => {
    const code = referral.generateReferralCode('alice');
    referral.recordScan(code, 'bob', 'vaultA');

    fs.mkdirSync('sourceVault', { recursive: true });
    fs.writeFileSync('sourceVault/metadata.json', '{}');

    const session = {
      referrer_id: code,
      source_vault: 'sourceVault',
      new_vault: 'forkedVault'
    };
    fs.writeFileSync('qr_session.json', JSON.stringify(session, null, 2));

    forkVault('qr_session.json');

    const registry = JSON.parse(fs.readFileSync('vault_registry.json', 'utf-8'));
    expect(registry[0].referrer_id).toBe(code);

    const rewards = JSON.parse(fs.readFileSync(path.join('admin', 'referral_rewards.json'), 'utf-8'));
    expect(rewards.alice.credits).toBeGreaterThan(0);
  });
});
