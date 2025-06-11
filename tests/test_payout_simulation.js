const fs = require('fs');
const path = require('path');
const os = require('os');
const { computePayoutSummary } = require('../admin/payout_engine');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

describe('Payout Simulation', () => {
  let tempDir;
  const now = new Date('2025-06-30T00:00:00Z');

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'payout-test-'));
    process.chdir(tempDir);
    ensureFileAndDir('referral_rewards.json', '[]');
  });

  afterEach(() => {
    process.chdir(__dirname + '/..');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('calculates rewards from exports and unlocks', () => {
    const events = [
      { referrer_id: 'user1', type: 'export', credits: 100, timestamp: '2025-06-01T00:00:00Z' },
      { referrer_id: 'user1', type: 'agent_unlock', credits: 20, timestamp: '2025-06-05T00:00:00Z' },
    ];
    fs.writeFileSync('referral_rewards.json', JSON.stringify(events, null, 2));
    const summary = computePayoutSummary(events, now);
    expect(summary.referrers.user1.totalEarned).toBeCloseTo(18);
    expect(summary.referrers.user1.payoutThisMonth).toBeCloseTo(18);
  });

  test('applies decay when no recent activity', () => {
    const events = [
      { referrer_id: 'user2', type: 'fork', credits: 50, timestamp: '2025-03-01T00:00:00Z' },
    ];
    fs.writeFileSync('referral_rewards.json', JSON.stringify(events, null, 2));
    const summary = computePayoutSummary(events, now);
    // base reward = 7.5, decay 50% => 3.75
    expect(summary.referrers.user2.payoutThisMonth).toBeCloseTo(3.75);
  });
});
