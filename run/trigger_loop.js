const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const SIGNAL_LOG = path.resolve('runtime/signal_log.json');

function loadLog() {
  ensureFileAndDir(SIGNAL_LOG, '[]');
  try {
    return JSON.parse(fs.readFileSync(SIGNAL_LOG, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLog(log) {
  ensureFileAndDir(SIGNAL_LOG);
  fs.writeFileSync(SIGNAL_LOG, JSON.stringify(log, null, 2));
}

function trigger(target, action = 'trigger_loop', source = 'cli') {
  const log = loadLog();
  log.push({ source, target, action, timestamp: new Date().toISOString(), handled: false });
  saveLog(log);
  console.log('Signal logged for', target);
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node trigger_loop.js <agent_id>');
    process.exit(1);
  }
  trigger(target);
}

module.exports = trigger;
