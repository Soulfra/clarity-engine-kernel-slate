const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const SYNC_FILE = path.resolve(__dirname, 'agent_sync.json');

function loadSync() {
  ensureFileAndDir(SYNC_FILE, '{}');
  try {
    return JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSync(data) {
  ensureFileAndDir(SYNC_FILE);
  fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2));
}

function recordDecision(agentId, decision) {
  const data = loadSync();
  if (!data[agentId]) data[agentId] = [];
  data[agentId].push({ decision, timestamp: new Date().toISOString() });
  saveSync(data);
}

module.exports = { loadSync, recordDecision };
