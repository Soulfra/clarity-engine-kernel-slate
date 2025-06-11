const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const VAULT_PATH = path.resolve('vaults/vault_0001_soulfra_kernel');
const SEAL_PATH = path.join(VAULT_PATH, 'seal_log.json');

function hashDirectory(dir, hash) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)) : [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hashDirectory(fullPath, hash);
    } else if (entry.isFile()) {
      if (fullPath === SEAL_PATH) continue;
      const data = fs.readFileSync(fullPath);
      hash.update(data);
    }
  }
}

function generateKernelFingerprint(vaultDir = VAULT_PATH, timestamp, salt = '') {
  const hash = crypto.createHash('sha256');
  hashDirectory(vaultDir, hash);
  if (timestamp) hash.update(timestamp);
  if (salt) hash.update(salt);
  return hash.digest('hex');
}

function sealKernel({ vaultPath = VAULT_PATH, lockedBy = 'unknown', salt = '' } = {}) {
  const timestamp = new Date().toISOString();
  const kernel_fingerprint = generateKernelFingerprint(vaultPath, timestamp, salt);
  const seal = { kernel_fingerprint, timestamp, locked_by: lockedBy };
  ensureFileAndDir(SEAL_PATH);
  fs.writeFileSync(SEAL_PATH, JSON.stringify(seal, null, 2));
  return seal;
}

function loadSeal() {
  if (!fs.existsSync(SEAL_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(SEAL_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

module.exports = {
  generateKernelFingerprint,
  sealKernel,
  loadSeal,
  SEAL_PATH,
  VAULT_PATH,
};
