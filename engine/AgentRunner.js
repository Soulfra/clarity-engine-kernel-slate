const fs = require('fs');
const path = require('path');
const SealManager = require('./SealManager');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const AGENT_LOG = path.resolve('agent_log.json');
const ORIGIN_VAULT = 'vault_0001_soulfra_kernel';

function loadLog() {
  if (!fs.existsSync(AGENT_LOG)) {
    ensureFileAndDir(AGENT_LOG, '[]');
  }
  try {
    return JSON.parse(fs.readFileSync(AGENT_LOG, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLog(log) {
  ensureFileAndDir(AGENT_LOG);
  fs.writeFileSync(AGENT_LOG, JSON.stringify(log, null, 2));
}

function validateAgent(agent) {
  const seal = SealManager.loadSeal();
  if (!seal) {
    return { valid: false, reason: 'seal_not_found' };
  }
  if (agent.origin_vault !== ORIGIN_VAULT) {
    return { valid: false, reason: 'invalid_origin_vault' };
  }
  if (agent.kernel_fingerprint !== seal.kernel_fingerprint) {
    return { valid: false, reason: 'fingerprint_mismatch' };
  }
  if (agent.requires_llm_access && !process.env.LLM_KEY) {
    return { valid: false, reason: 'llm_key_invalid' };
  }
  return { valid: true };
}

function runAgent(agentPath) {
  const log = loadLog();
  const timestamp = new Date().toISOString();
  let agent;
  try {
    agent = JSON.parse(fs.readFileSync(agentPath, 'utf-8'));
  } catch (err) {
    const entry = { agent: agentPath, timestamp, success: false, reason: 'load_error' };
    log.push(entry);
    saveLog(log);
    console.error('Failed to load agent:', err.message);
    return;
  }

  const validation = validateAgent(agent);
  if (!validation.valid) {
    const entry = { agent: agentPath, timestamp, success: false, reason: validation.reason };
    log.push(entry);
    saveLog(log);
    console.error('Agent validation failed:', validation.reason);
    return;
  }

  const entry = { agent: agentPath, timestamp, success: true };
  log.push(entry);
  saveLog(log);
  console.log('Agent validated and executed.');
}

if (require.main === module) {
  const agentPath = process.argv[2];
  if (!agentPath) {
    console.error('Usage: node AgentRunner.js <agent.json>');
    process.exit(1);
  }
  runAgent(agentPath);
}

module.exports = { runAgent, validateAgent };
