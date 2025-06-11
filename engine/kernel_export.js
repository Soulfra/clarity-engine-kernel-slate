const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const vaultPath = process.argv[2];
if (!vaultPath) {
  console.error('Usage: node kernel_export.js <vault_path>');
  process.exit(1);
}

const CREDITS_FILE = path.resolve('credits.json');
const LOOP_LOG = path.resolve('loop_log.json');
const ADMIN_DIR = path.resolve('admin');
const ADMIN_EXPORT_LOG = path.join(ADMIN_DIR, 'export_log.json');
const BUYBACK_LOG = path.join(ADMIN_DIR, 'buyback_log.json');
const BASE_SEAL = path.resolve('vaults/vault_0001_soulfra_kernel/seal_log.json');
const EXPORT_DIR = path.resolve('export');
const EXPORT_COST = 50;
const BUYBACK_AMOUNT = 20;

function loadJSON(file, fallback) {
  if (!fs.existsSync(file)) {
    ensureFileAndDir(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function appendJSON(file, entry) {
  const arr = loadJSON(file, []);
  arr.push(entry);
  saveJSON(file, arr);
}

function validateFingerprint(meta) {
  const base = loadJSON(BASE_SEAL, {});
  return !!meta.fingerprint && meta.fingerprint === base.fingerprint;
}

function deductCredits(amount) {
  const credits = loadJSON(CREDITS_FILE, { balance: 0 });
  if (credits.balance < amount) return false;
  credits.balance -= amount;
  saveJSON(CREDITS_FILE, credits);
  appendJSON(LOOP_LOG, {
    timestamp: new Date().toISOString(),
    action: 'deduct',
    amount,
    balance: credits.balance,
  });
  return true;
}

function exportVault() {
  if (process.env.LLM_LOCK === '1' || fs.existsSync(path.join(vaultPath, '.llm_lock'))) {
    throw new Error('Export blocked by LLM lock');
  }

  const metaFile = path.join(vaultPath, 'metadata.json');
  if (!fs.existsSync(metaFile)) throw new Error('Missing metadata');
  const meta = loadJSON(metaFile, {});
  if (!validateFingerprint(meta)) throw new Error('Invalid fingerprint');
  if (!deductCredits(EXPORT_COST)) throw new Error('Insufficient credits');

  const zipName = `${meta.vault_id || path.basename(vaultPath)}_${Date.now()}.zip`;
  ensureFileAndDir(EXPORT_DIR);
  const outputDir = path.join(vaultPath, 'output');
  execSync(`zip -r ${path.join(EXPORT_DIR, zipName)} .`, { cwd: outputDir });

  const logEntry = {
    timestamp: new Date().toISOString(),
    vault_id: meta.vault_id || path.basename(vaultPath),
    creator: meta.creator || 'unknown',
    fingerprint: meta.fingerprint,
    exported_by: 'local_user',
    credits_used: EXPORT_COST,
  };

  appendJSON(path.join(vaultPath, 'export_log.json'), logEntry);
  appendJSON(ADMIN_EXPORT_LOG, logEntry);

  if (meta.referred_by) {
    appendJSON(BUYBACK_LOG, {
      referrer: meta.referred_by,
      vault_id: meta.vault_id || path.basename(vaultPath),
      buyback_amount: BUYBACK_AMOUNT,
      credited_to: meta.referred_by,
    });
  }
}

if (require.main === module) {
  try {
    exportVault();
    console.log('Export complete');
  } catch (err) {
    appendJSON(LOOP_LOG, { timestamp: new Date().toISOString(), vault: vaultPath, error: err.message });
    console.error('Export failed:', err.message);
    process.exit(1);
  }
}

module.exports = exportVault;
