const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { stitch } = require('./memory_stitcher');

function loadJson(file, def) {
  if (!fs.existsSync(file)) {
    ensureFileAndDir(file, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return def;
  }
}

function hash(obj) {
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify(obj));
  return h.digest('hex');
}

function compress(vaultIds = []) {
  const memory = stitch(vaultIds);
  const summary = {
    version: 1,
    timestamp: new Date().toISOString(),
    vault_count: Object.keys(memory.summaries).length,
    loop_events: memory.loop_logs.length,
    agent_runs: memory.agent_outputs.length,
    trust_entries: Object.keys(memory.trust).length
  };

  const fingerprint = hash({ summary, trust: memory.trust });
  const filename = `summary_${fingerprint.slice(0, 8)}.json`;
  const summaryPath = path.join('memory', 'memory_blobs', filename);
  ensureFileAndDir(summaryPath);
  fs.writeFileSync(summaryPath, JSON.stringify({ summary, fingerprint }, null, 2));

  const logFile = path.join('memory', 'embedded_log.json');
  const log = loadJson(logFile, []);
  log.push({ timestamp: summary.timestamp, summary_file: filename, fingerprint });
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));

  return summaryPath;
}

if (require.main === module) {
  const ids = process.argv.slice(2);
  const out = compress(ids);
  console.log('Memory summary written:', out);
}

module.exports = compress;

