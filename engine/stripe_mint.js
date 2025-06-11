const fs = require('fs');
const path = require('path');
require('dotenv').config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
const STRIPE_LOG = path.resolve('admin/stripe_log.json');
const REWARD_POLICY_PATH = path.resolve('admin/reward_allocation.json');

function loadRewardPolicy() {
  if (!fs.existsSync(REWARD_POLICY_PATH)) {
    return {
      creator_share: 0.4,
      referrer_share: 0.2,
      vault_buyback: 0.1,
      soulfra_core: 0.3
    };
  }
  try {
    return JSON.parse(fs.readFileSync(REWARD_POLICY_PATH, 'utf-8'));
  } catch {
    return {
      creator_share: 0.4,
      referrer_share: 0.2,
      vault_buyback: 0.1,
      soulfra_core: 0.3
    };
  }
}

function ensureFile(file, fallback='[]') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, fallback);
}

function logStripe(event) {
  ensureFile(STRIPE_LOG);
  const log = JSON.parse(fs.readFileSync(STRIPE_LOG, 'utf-8'));
  log.push(event);
  fs.writeFileSync(STRIPE_LOG, JSON.stringify(log, null, 2));
}

function loadWallet(userId) {
  const walletPath = path.join('wallets', userId, 'wallet.json');
  ensureFile(walletPath, JSON.stringify({
    credits_earned: 0,
    credits_spent: 0,
    agents_unlocked: [],
    exports_triggered: [],
    referral_rewards: 0,
    buyback_received: 0
  }, null, 2));
  return { wallet: JSON.parse(fs.readFileSync(walletPath, 'utf-8')), walletPath };
}

function saveWallet(wallet, walletPath) {
  fs.writeFileSync(walletPath, JSON.stringify(wallet, null, 2));
}

function mintCredits({ userId, creditsPurchased, referrerId }) {
  const policy = loadRewardPolicy();
  const { wallet, walletPath } = loadWallet(userId);
  wallet.credits_earned += creditsPurchased * policy.creator_share;
  if (referrerId) {
    const { wallet: refWallet, walletPath: refPath } = loadWallet(referrerId);
    const bonus = creditsPurchased * policy.referrer_share;
    refWallet.referral_rewards += bonus;
    saveWallet(refWallet, refPath);
  }
  wallet.buyback_received += creditsPurchased * policy.vault_buyback;
  saveWallet(wallet, walletPath);

  logStripe({
    user: userId,
    credits_purchased: creditsPurchased,
    source: 'stripe',
    referrer_id: referrerId || null,
    timestamp: new Date().toISOString()
  });
}

if (require.main === module) {
  const [,, userId, credits, referrer] = process.argv;
  if (!userId || !credits) {
    console.error('Usage: node engine/stripe_mint.js <userId> <credits> [referrerId]');
    process.exit(1);
  }
  mintCredits({ userId, creditsPurchased: Number(credits), referrerId: referrer });
  console.log('Credits minted for', userId);
}

module.exports = { mintCredits };
