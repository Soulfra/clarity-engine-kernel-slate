const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const CREDIT_FILE = path.resolve('admin/credits.json');
const LOOP_LOG = path.resolve('loop_log.json');

function loadCredits() {
  ensureFileAndDir(CREDIT_FILE, '{}');
  try {
    return JSON.parse(fs.readFileSync(CREDIT_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCredits(data) {
  ensureFileAndDir(CREDIT_FILE);
  fs.writeFileSync(CREDIT_FILE, JSON.stringify(data, null, 2));
}

function appendLoopLog(entry) {
  ensureFileAndDir(LOOP_LOG, '[]');
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(LOOP_LOG, 'utf-8'));
  } catch {}
  log.push(entry);
  fs.writeFileSync(LOOP_LOG, JSON.stringify(log, null, 2));
}

class CreditManager {
  constructor(userId) {
    this.userId = userId;
    this.credits = loadCredits();
  }

  hasCredits(amount) {
    const user = this.credits[this.userId];
    return user && user.balance >= amount;
  }

  deduct(amount, logEntry) {
    if (!this.hasCredits(amount)) {
      throw new Error('Insufficient credits');
    }
    const user = this.credits[this.userId];
    user.balance -= amount;
    user.spent = (user.spent || 0) + amount;
    saveCredits(this.credits);
    if (logEntry) {
      logEntry.credits_used = amount;
    }
  }
}

module.exports = CreditManager;
