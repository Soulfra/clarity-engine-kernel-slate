const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const MEMORY_LOG = path.resolve('memory/os_agent_log.json');

function loadLog(){
  ensureFileAndDir(MEMORY_LOG, '[]');
  try { return JSON.parse(fs.readFileSync(MEMORY_LOG, 'utf-8')); } catch { return []; }
}

function saveLog(log){
  fs.writeFileSync(MEMORY_LOG, JSON.stringify(log, null, 2));
}

async function handleQuery(query, session){
  const log = loadLog();
  log.push({ query, session, timestamp: new Date().toISOString() });
  saveLog(log);
  return `Echo: ${query}`;
}

module.exports = { handleQuery };
