const fs = require('fs');
const path = require('path');
const os = require('os');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const FILES = [
  'engine/buyback_engine.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

const ROUTES = {
  referrer: 0.15,
  creator: 0.30,
  agent_author: 0.25,
  buyback_pool: 0.10,
  soulfra_core: 0.20
};

describe('Buyback Distribution', () => {
  let tempDir;
  const orig = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buyback-test-'));
    for (const f of FILES) {
      const src = path.resolve(f);
      const dest = path.join(tempDir, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('admin', { recursive: true });
    fs.mkdirSync('wallets', { recursive: true });
    fs.writeFileSync('admin/profit_routes.json', JSON.stringify(ROUTES, null, 2));
  });

  afterEach(() => {
    process.chdir(orig);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('distributes credits and logs results', () => {
    const event = {
      action: 'export',
      vault_id: 'v1',
      creator: 'alice',
      referrer: 'bob',
      agent_author: 'carol',
      credits_used: 100
    };
    fs.writeFileSync('admin/export_log.json', JSON.stringify([event], null, 2));

    const engine = require(path.join(tempDir, 'engine/buyback_engine.js'));
    const results = engine.processBuybacks();
    expect(results.length).toBe(1);

    const alice = JSON.parse(fs.readFileSync('wallets/alice/wallet.json', 'utf-8'));
    const bob = JSON.parse(fs.readFileSync('wallets/bob/wallet.json', 'utf-8'));
    const carol = JSON.parse(fs.readFileSync('wallets/carol/wallet.json', 'utf-8'));
    const pool = JSON.parse(fs.readFileSync('wallets/buyback_pool/wallet.json', 'utf-8'));
    const core = JSON.parse(fs.readFileSync('wallets/soulfra_core/wallet.json', 'utf-8'));

    expect(alice.buyback_received).toBeCloseTo(30);
    expect(bob.referral_rewards).toBeCloseTo(15);
    expect(carol.buyback_received).toBeCloseTo(25);
    expect(pool.buyback_received).toBeCloseTo(10);
    expect(core.buyback_received).toBeCloseTo(20);

    const log = JSON.parse(fs.readFileSync('admin/buyback_log.json', 'utf-8'));
    expect(log.length).toBe(1);
    expect(log[0].total_credits).toBe(100);
  });

  test('preview mode does not write files', () => {
    const event = { action: 'export', vault_id: 'v2', creator: 'd', credits_used: 50 };
    fs.writeFileSync('admin/export_log.json', JSON.stringify([event], null, 2));

    const engine = require(path.join(tempDir, 'engine/buyback_engine.js'));
    const results = engine.processBuybacks({ preview: true });
    expect(results.length).toBe(1);
    expect(fs.existsSync('wallets/d/wallet.json')).toBe(false);
    const log = JSON.parse(fs.readFileSync('admin/buyback_log.json', 'utf-8'));
    expect(log.length).toBe(0);
  });
});
