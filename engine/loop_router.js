const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const agentSync = require('../runtime/agent_sync');

const SIGNAL_LOG = path.resolve('runtime/signal_log.json');
const AGENTS_DIR = path.resolve('agents');
const DEFAULT_COOLDOWN = parseInt(process.env.LOOP_COOLDOWN_MS || '30000', 10);

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

function loadAgentState(agentId) {
  const file = path.join(AGENTS_DIR, agentId, 'agent_state.json');
  return loadJson(file, {});
}

function saveAgentState(agentId, data) {
  const file = path.join(AGENTS_DIR, agentId, 'agent_state.json');
  saveJson(file, data);
}

async function routeSignals(options = {}) {
  const { handlers = {}, cooldown = DEFAULT_COOLDOWN } = options;
  const log = loadJson(SIGNAL_LOG, []);
  let changed = false;

  for (const entry of log) {
    if (entry.handled) continue;
    const { target, action } = entry;
    if (action === 'trigger_loop') {
      const state = loadAgentState(target);
      const now = Date.now();
      const last = state.last_trigger ? new Date(state.last_trigger).getTime() : 0;
      if (now - last < cooldown) continue;

      if (handlers.trigger_loop) {
        await handlers.trigger_loop(entry);
      } else {
        await require('./LoopRunner').run();
      }
      state.last_trigger = new Date().toISOString();
      saveAgentState(target, state);
      agentSync.recordDecision(target, 'trigger_loop');
      entry.handled = true;
      changed = true;
    }
  }

  if (changed) {
    saveJson(SIGNAL_LOG, log);
  }
}

module.exports = { routeSignals };
