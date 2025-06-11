const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const LOG_PATH = path.resolve('admin/soft_id_log.json');

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

function generateFingerprint(sessionId = '') {
  const data = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus().length,
    sessionId,
  ].join('|');
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return { identity_id: hash.digest('hex') };
}

function persistIdentity(identity, action = '') {
  const log = loadLog();
  log.push({
    identity_id: identity.identity_id,
    timestamp: new Date().toISOString(),
    action,
  });
  saveLog(log);
}

module.exports = { generateFingerprint, persistIdentity };
