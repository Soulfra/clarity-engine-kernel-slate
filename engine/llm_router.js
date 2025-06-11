const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const CreditManager = require('./CreditManager');

const MODEL_CONFIG_FILE = path.resolve(__dirname, 'model_configs.json');
const USAGE_LOG = path.resolve('admin/model_usage_log.json');
const POLICY_FILE = path.resolve('admin/router_policy.json');
const STATS_FILE = path.resolve('admin/router_stats.json');

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

function getAgentConfig(agentId) {
  const p = path.resolve('agents', agentId, 'agent.json');
  return loadJson(p, {});
}

function inCooldown(modelId, stats, configs) {
  if (!stats[modelId]) return false;
  const last = new Date(stats[modelId].last_used).getTime();
  const diff = Date.now() - last;
  return diff < (configs[modelId].cooldown_ms || 0);
}

async function simulateCall(modelId, task) {
  const start = Date.now();
  const tokens = task.split(/\s+/).filter(Boolean).length * 2;
  await new Promise(r => setTimeout(r, 5));
  return { result: `stub:${modelId}`, tokens, latency: Date.now() - start };
}

async function routeRequest(agentId, session, task) {
  const configs = loadJson(MODEL_CONFIG_FILE, {});
  const policy = loadJson(POLICY_FILE, {});
  const stats = loadJson(STATS_FILE, {});
  const agent = getAgentConfig(agentId);
  const cm = new CreditManager(session.user_id || 'anon');

  const allModels = Object.keys(configs);
  const ordered = agent.preferred_model
    ? [agent.preferred_model, ...allModels.filter(m => m !== agent.preferred_model)]
    : allModels;

  let chosen;
  for (const modelId of ordered) {
    const cfg = configs[modelId];
    if (!cfg || cfg.eligible === false) continue;
    const pol = policy[modelId] || {};
    const trustReq = pol.min_trust || cfg.trust_required || 0;
    if (session.trust_level !== undefined && session.trust_level < trustReq) continue;
    if (inCooldown(modelId, stats, configs)) continue;
    const estTokens = task.split(/\s+/).filter(Boolean).length * 2;
    const estCost = (cfg.cost_per_call || 0) + (cfg.cost_per_token || 0) * estTokens;
    if (!cm.hasCredits(estCost)) continue;
    chosen = modelId;
    break;
  }

  if (!chosen) throw new Error('no_model_available');

  const { result, tokens, latency } = await simulateCall(chosen, task);
  const cfg = configs[chosen];
  const cost = (cfg.cost_per_call || 0) + (cfg.cost_per_token || 0) * tokens;
  cm.deduct(cost);

  stats[chosen] = { last_used: new Date().toISOString(), latency_ms: latency };
  saveJson(STATS_FILE, stats);

  const log = loadJson(USAGE_LOG, []);
  log.push({
    vault_id: session.vault_id || 'unknown',
    agent: agentId,
    model_used: chosen,
    credits_spent: cost,
    tokens,
    time: new Date().toISOString(),
    latency_ms: latency
  });
  saveJson(USAGE_LOG, log);

  return { model: chosen, result };
}

module.exports = { routeRequest };
