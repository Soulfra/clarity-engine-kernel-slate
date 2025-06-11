// RecurrenceEngine - scans vaults and logs inactivity
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const VAULTS_DIR = path.resolve('vaults');
const LOG_PATH = path.resolve('admin/recurrence_log.json');

function loadLog() {
  ensureFileAndDir(LOG_PATH, '[]');
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLog(log) {
  ensureFileAndDir(LOG_PATH);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function scanVaults() {
  ensureFileAndDir(LOG_PATH, '[]');
  if (!fs.existsSync(VAULTS_DIR)) return [];
  const log = loadLog();
  const vaults = fs.readdirSync(VAULTS_DIR).filter(f => fs.statSync(path.join(VAULTS_DIR, f)).isDirectory());
  const now = Date.now();
  const updated = [];
  for (const vault of vaults) {
    const configPath = path.join(VAULTS_DIR, vault, 'wakeup.json');
    if (!fs.existsSync(configPath)) continue;
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      continue;
    }
    if (cfg.opt_out) continue;
    const lastRun = new Date(cfg.last_run || 0).getTime();
    const remindDays = cfg.remind_after_days || 7;
    const diffDays = (now - lastRun) / (1000 * 60 * 60 * 24);
    if (diffDays >= remindDays) {
      updated.push({
        vault_id: vault,
        last_run: cfg.last_run || null,
        next_check: new Date(now).toISOString(),
        wakeup_conditions: ['inactivity'],
      });
    }
  }
  if (updated.length > 0) {
    log.push(...updated);
    saveLog(log);
  }
  return updated;
}

if (require.main === module) {
  const result = scanVaults();
  if (result.length) {
    console.log('Vaults needing wakeup:', result.map(r => r.vault_id).join(', '));
  } else {
    console.log('No dormant vaults found.');
  }
}

module.exports = { scanVaults };
