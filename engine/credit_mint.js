// credit_mint.js - file-based credit minting logic
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const CREDITS_PATH = path.resolve('admin/credits.json');
const INVITES_PATH = path.resolve('admin/invite_codes.json');
const LOG_PATH = path.resolve('admin/mint_log.json');

function loadJson(filePath, defaultValue) {
  ensureFileAndDir(filePath, JSON.stringify(defaultValue, null, 2));
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  ensureFileAndDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function mintCredits(qr_user_id, credits_requested, invite_code) {
  const credits = loadJson(CREDITS_PATH, {});
  const invites = loadJson(INVITES_PATH, []);
  const log = loadJson(LOG_PATH, []);

  let bonus = 0;
  let source = 'manual';
  if (invite_code) {
    const invite = invites.find(i => i.code === invite_code);
    if (invite && !invite.used) {
      bonus = invite.bonus_credits || 0;
      invite.used = true;
      source = `invite:${invite_code}`;
    } else {
      source = `invalid_invite:${invite_code}`;
    }
  }

  credits[qr_user_id] = (credits[qr_user_id] || 0) + credits_requested + bonus;

  log.push({
    user: qr_user_id,
    credits: credits_requested,
    bonus,
    timestamp: new Date().toISOString(),
    source
  });

  saveJson(CREDITS_PATH, credits);
  saveJson(INVITES_PATH, invites);
  saveJson(LOG_PATH, log);

  return { user: qr_user_id, credits: credits[qr_user_id], bonus, source };
}

if (require.main === module) {
  const [,, userId, creditStr, invite] = process.argv;
  const amount = parseInt(creditStr, 10);
  if (!userId || isNaN(amount)) {
    console.log('Usage: node engine/credit_mint.js <qr_user_id> <credits_requested> [invite_code]');
    process.exit(1);
  }
  mintCredits(userId, amount, invite);
}

module.exports = { mintCredits };
