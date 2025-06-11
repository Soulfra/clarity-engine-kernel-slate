const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const REGISTRY_PATH = path.resolve('sync/export_registry.json');
const TRUST_LOG_PATH = path.resolve('sync/trust_log.json');

function loadJson(file, defaultVal) {
  if (!fs.existsSync(file)) {
    ensureFileAndDir(file, JSON.stringify(defaultVal, null, 2));
    return JSON.parse(JSON.stringify(defaultVal));
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(defaultVal));
  }
}

function saveJson(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUser() {
  return process.env.USER || process.env.USERNAME || 'unknown';
}

function generateFingerprint(vaultId) {
  const h = crypto.createHash('sha256');
  h.update(vaultId + Date.now().toString());
  return h.digest('hex').slice(0, 16);
}

function run() {
  const args = process.argv.slice(2);
  const vaultIdx = args.indexOf('--vault');
  const vaultId = vaultIdx !== -1 && args[vaultIdx + 1] ? args[vaultIdx + 1] : 'unknown_vault';
  const creatorIdx = args.indexOf('--creator');
  const creator = creatorIdx !== -1 && args[creatorIdx + 1] ? args[creatorIdx + 1] : getUser();
  const trustIdx = args.indexOf('--trust-level');
  const trustLevel = trustIdx !== -1 && args[trustIdx + 1] ? args[trustIdx + 1] : 'unverified';

  const fingerprint = generateFingerprint(vaultId);

  const entry = {
    vault_id: vaultId,
    fingerprint,
    creator,
    exported_by: getUser(),
    timestamp: new Date().toISOString(),
    trust_level: trustLevel
  };

  const registry = loadJson(REGISTRY_PATH, []);
  registry.push(entry);
  saveJson(REGISTRY_PATH, registry);

  const log = loadJson(TRUST_LOG_PATH, {});
  log[fingerprint] = { vault_id: vaultId, trust_level: trustLevel, creator };
  saveJson(TRUST_LOG_PATH, log);

  const pingPath = path.resolve(`trust_${fingerprint}.ping`);
  ensureFileAndDir(pingPath);
  fs.writeFileSync(pingPath, JSON.stringify(entry, null, 2));

  console.log(`Export logged. Ping file created at ${pingPath}`);
}

if (require.main === module) {
  run();
}

module.exports = run;
