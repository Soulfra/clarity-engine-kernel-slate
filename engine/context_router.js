const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const FINGERPRINT_FILE = path.resolve('.soulfra_fingerprint');
const MEMORY_FILE = path.resolve('memory/context_log.json');

function injectContext(prompt, session){
  ensureFileAndDir(MEMORY_FILE, '[]');
  const fingerprint = fs.existsSync(FINGERPRINT_FILE) ? fs.readFileSync(FINGERPRINT_FILE,'utf-8') : 'unknown';
  const entry = { prompt, session, fingerprint, timestamp: new Date().toISOString() };
  const log = JSON.parse(fs.readFileSync(MEMORY_FILE,'utf-8')||'[]');
  log.push(entry);
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(log,null,2));
  return `${prompt}\n[fingerprint:${fingerprint}]`;
}

module.exports = { injectContext };
