const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function loadJson(file, def) {
  ensureFileAndDir(file, JSON.stringify(def, null, 2));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(def));
  }
}

function stitch(vaultIds = []) {
  const memory = {
    summaries: {},
    loop_logs: [],
    agent_outputs: [],
    trust: {}
  };

  for (const vid of vaultIds) {
    const sumPath = path.join('vaults', vid, 'SUMMARY.md');
    if (fs.existsSync(sumPath)) {
      memory.summaries[vid] = fs.readFileSync(sumPath, 'utf-8');
    }
    const logPath = path.join('vaults', vid, 'loop_log.json');
    if (fs.existsSync(logPath)) {
      const entries = loadJson(logPath, []);
      memory.loop_logs.push(...entries);
    }
  }

  memory.agent_outputs = loadJson('agent_log.json', []);
  memory.trust = loadJson('sync/trust_log.json', {});

  return memory;
}

module.exports = { stitch };
