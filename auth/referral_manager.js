const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const LOG_PATH = path.resolve('auth/referral_log.json');
const REWARD_PATH = path.resolve('admin/referral_rewards.json');
const LOOP_LOG = path.resolve('loop_log.json');

function loadJSON(p, defaultValue) {
  if (!fs.existsSync(p)) {
    ensureFileAndDir(p, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    logSilentFailure(`Failed to parse ${p}: ${err.message}`);
    return defaultValue;
  }
}

function saveJSON(p, data) {
  ensureFileAndDir(p);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function logSilentFailure(msg) {
  const log = loadJSON(LOOP_LOG, []);
  log.push({ timestamp: new Date().toISOString(), error: msg });
  saveJSON(LOOP_LOG, log);
}

function generateReferralCode(dropperId) {
  const code = crypto.randomBytes(4).toString('hex');
  const log = loadJSON(LOG_PATH, []);
  log.push({ referral_id: code, dropper_id: dropperId, scan_history: [] });
  saveJSON(LOG_PATH, log);
  return code;
}

function recordScan(referralId, scannerId, vaultId) {
  const log = loadJSON(LOG_PATH, []);
  const entry = log.find(l => l.referral_id === referralId);
  if (!entry) {
    logSilentFailure(`Unknown referral ${referralId}`);
    return;
  }
  const scan = { scanner_id: scannerId, vault_id: vaultId, timestamp: new Date().toISOString() };
  entry.scan_history.push(scan);
  if (!entry.first_scan_id) entry.first_scan_id = scannerId;
  saveJSON(LOG_PATH, log);

  const rewards = loadJSON(REWARD_PATH, {});
  const r = rewards[entry.dropper_id] || { credits: 0 };
  r.credits += 1;
  rewards[entry.dropper_id] = r;
  saveJSON(REWARD_PATH, rewards);
}

function getReferrer(referralId) {
  const log = loadJSON(LOG_PATH, []);
  const entry = log.find(l => l.referral_id === referralId);
  return entry ? entry.dropper_id : null;
}

module.exports = { generateReferralCode, recordScan, getReferrer };
