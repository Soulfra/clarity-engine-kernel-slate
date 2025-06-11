const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { computePayoutSummary } = require('../admin/payout_engine');

const REFERRAL_LOG = path.resolve('referral_rewards.json');
const BADGE_DIR = path.resolve('badges/data');

function loadEvents() {
  ensureFileAndDir(REFERRAL_LOG, '[]');
  return JSON.parse(fs.readFileSync(REFERRAL_LOG, 'utf-8'));
}

function badgeForTotal(total) {
  if (total > 500) return 'gold';
  if (total > 200) return 'silver';
  if (total > 50) return 'bronze';
  return 'newbie';
}

function generateBadges() {
  const events = loadEvents();
  const summary = computePayoutSummary(events);
  ensureFileAndDir(BADGE_DIR);
  for (const [id, data] of Object.entries(summary.referrers)) {
    const badge = {
      referrer_id: id,
      badge: badgeForTotal(data.totalEarned),
      totalEarned: data.totalEarned,
    };
    const file = path.join(BADGE_DIR, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(badge, null, 2));
  }
}

if (require.main === module) {
  generateBadges();
  console.log('Badges generated in badges/data');
}

module.exports = { generateBadges };
