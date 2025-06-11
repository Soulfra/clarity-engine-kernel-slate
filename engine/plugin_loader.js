const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const llmRouter = require('./llm_router');
const CreditManager = require('./CreditManager');

const REGISTRY_FILE = path.resolve('plugins/agent_registry.json');
const MANIFEST_FILE = path.resolve('plugins/agent_manifest.json');
const USAGE_LOG = path.resolve('admin/plugin_usage_log.json');
const TRUST_LEVEL = 3;

function loadJson(file, def) {
  ensureFileAndDir(file, JSON.stringify(def, null, 2));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(def));
  }
}

function saveJson(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getAgentInfo(agentId) {
  const reg = loadJson(REGISTRY_FILE, {});
  return reg[agentId];
}

async function run(agentId, session, task) {
  const info = getAgentInfo(agentId);
  if (!info) throw new Error('missing_agent');
  if ((info.trust_score || 0) < TRUST_LEVEL) throw new Error('untrusted_agent');
  const cm = new CreditManager(session.user_id || 'anon');
  const cost = info.credits_per_use || 0;
  if (cost > 0) {
    if (!cm.hasCredits(cost)) throw new Error('insufficient_credits');
    cm.deduct(cost);
  }
  const routed = await llmRouter.routeRequest(agentId, session, task);
  const usage = loadJson(USAGE_LOG, []);
  usage.push({
    agent_id: agentId,
    model_used: routed.model,
    user: session.user_id || 'anon',
    credits_spent: cost,
    timestamp: new Date().toISOString()
  });
  saveJson(USAGE_LOG, usage);
  const manifest = loadJson(MANIFEST_FILE, []);
  const entry = manifest.find(m => m.agent_id === agentId);
  if (entry) {
    entry.last_use = new Date().toISOString();
    saveJson(MANIFEST_FILE, manifest);
  }
  return routed.result;
}

module.exports = { run, getAgentInfo };
