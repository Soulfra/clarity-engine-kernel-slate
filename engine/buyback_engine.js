const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const EXPORT_LOG = path.resolve('admin/export_log.json');
const BUYBACK_LOG = path.resolve('admin/buyback_log.json');
const PROFIT_ROUTES = path.resolve('admin/profit_routes.json');

const DEFAULT_ROUTES = {
  referrer: 0.15,
  creator: 0.30,
  agent_author: 0.25,
  buyback_pool: 0.10,
  soulfra_core: 0.20
};

const DEFAULT_WALLET = {
  credits_earned: 0,
  credits_spent: 0,
  agents_unlocked: [],
  exports_triggered: [],
  referral_rewards: 0,
  buyback_received: 0
};

function loadJson(file, def) {
  ensureFileAndDir(file, JSON.stringify(def, null, 2));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(def));
  }
}

function saveJson(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadWallet(userId, preview = false) {
  const walletPath = path.join('wallets', userId, 'wallet.json');
  if (preview) {
    if (fs.existsSync(walletPath)) {
      return { wallet: JSON.parse(fs.readFileSync(walletPath, 'utf-8')), walletPath };
    }
    return { wallet: JSON.parse(JSON.stringify(DEFAULT_WALLET)), walletPath };
  }
  ensureFileAndDir(walletPath, JSON.stringify(DEFAULT_WALLET, null, 2));
  return { wallet: JSON.parse(fs.readFileSync(walletPath, 'utf-8')), walletPath };
}

function saveWallet(wallet, walletPath, preview) {
  if (preview) return;
  fs.writeFileSync(walletPath, JSON.stringify(wallet, null, 2));
}

function appendUserLog(userId, entry, preview) {
  if (!userId || preview) return;
  const logPath = path.join('wallets', userId, 'earnings_log.json');
  const log = loadJson(logPath, []);
  log.push(entry);
  saveJson(logPath, log);
}

function distributeForEvent(ev, routes, preview) {
  const total = ev.total_credits || ev.credits_used || ev.buyback_amount || 0;
  if (total <= 0) return null;
  const destinations = {};
  const timestamp = new Date().toISOString();

  function credit(userId, amount, field) {
    if (!userId || amount <= 0) return;
    const { wallet, walletPath } = loadWallet(userId, preview);
    wallet[field] = (wallet[field] || 0) + amount;
    saveWallet(wallet, walletPath, preview);
    appendUserLog(userId, {
      action: ev.action || ev.type,
      vault: ev.vault_id || ev.source_vault,
      amount,
      field,
      timestamp
    }, preview);
    destinations[userId] = amount;
  }

  credit(ev.referrer, total * routes.referrer, 'referral_rewards');
  credit(ev.creator, total * routes.creator, 'buyback_received');
  credit(ev.agent_author, total * routes.agent_author, 'buyback_received');
  credit('buyback_pool', total * routes.buyback_pool, 'buyback_received');
  credit('soulfra_core', total * routes.soulfra_core, 'buyback_received');

  return destinations;
}

function processBuybacks(options = {}) {
  const { preview = false } = options;
  const routes = loadJson(PROFIT_ROUTES, DEFAULT_ROUTES);
  const events = loadJson(EXPORT_LOG, []);
  const log = loadJson(BUYBACK_LOG, []);
  const results = [];

  for (const ev of events) {
    if (ev.processed) continue;
    const dest = distributeForEvent(ev, routes, preview);
    if (!dest) continue;
    const entry = {
      action: ev.action || ev.type || 'unknown',
      source_vault: ev.vault_id || ev.source_vault || 'unknown',
      total_credits: ev.total_credits || ev.credits_used || ev.buyback_amount || 0,
      routes,
      destinations: dest,
      timestamp: new Date().toISOString()
    };
    results.push(entry);
    if (!preview) {
      log.push(entry);
      ev.processed = true;
    }
  }

  if (!preview) {
    saveJson(EXPORT_LOG, events);
    saveJson(BUYBACK_LOG, log);
  }

  return results;
}

if (require.main === module) {
  const preview = process.argv.includes('--preview');
  const res = processBuybacks({ preview });
  console.log(JSON.stringify(res, null, 2));
  if (preview) console.log('Preview mode, no files written.');
}

module.exports = { processBuybacks };
