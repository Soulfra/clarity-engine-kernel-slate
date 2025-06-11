// SwarmController - manages multi-agent swarms for vault loops
const fs = require('fs');
const path = require('path');
const { run: runLoop } = require('./LoopRunner');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const DEFAULT_VAULT = 'vaults/vault_kernel_build';
const CONTRIBUTORS_FILE = path.resolve(DEFAULT_VAULT, 'contributors.json');
const SWARM_STATE_FILE = path.resolve(DEFAULT_VAULT, 'swarm_state.json');

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    ensureFileAndDir(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  ensureFileAndDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class SwarmController {
  constructor(options = {}) {
    this.vault = options.vault || DEFAULT_VAULT;
    this.contributorsFile = options.contributorsFile || CONTRIBUTORS_FILE;
    this.swarmStateFile = options.swarmStateFile || SWARM_STATE_FILE;
  }

  loadContributors() {
    return loadJson(this.contributorsFile, []);
  }

  logContributor({ identity_id, action, agent_id, referrer }) {
    const contrib = this.loadContributors();
    contrib.push({
      identity_id,
      action,
      agent_id,
      referrer,
      timestamp: new Date().toISOString(),
    });
    saveJson(this.contributorsFile, contrib);
  }

  loadSwarmState() {
    return loadJson(this.swarmStateFile, {
      active_agents: [],
      last_updated: null,
      consensus_required: true,
      quorum_met: false,
    });
  }

  updateSwarmState(partial) {
    const state = { ...this.loadSwarmState(), ...partial };
    state.last_updated = new Date().toISOString();
    saveJson(this.swarmStateFile, state);
    return state;
  }

  async runAgentsSequential(agentConfigs = []) {
    const state = this.updateSwarmState({ active_agents: agentConfigs.map(a => a.id) });
    for (const cfg of agentConfigs) {
      await runLoop(cfg.options);
      this.logContributor({ identity_id: cfg.identity_id, action: 'agent_run', agent_id: cfg.id, referrer: cfg.referrer });
    }
    this.updateSwarmState({ active_agents: [] });
    return state;
  }

  async runAgentsParallel(agentConfigs = []) {
    this.updateSwarmState({ active_agents: agentConfigs.map(a => a.id) });
    await Promise.all(agentConfigs.map(cfg => {
      return runLoop(cfg.options).then(() => {
        this.logContributor({ identity_id: cfg.identity_id, action: 'agent_run', agent_id: cfg.id, referrer: cfg.referrer });
      });
    }));
    const state = this.updateSwarmState({ active_agents: [] });
    return state;
  }
}

module.exports = SwarmController;
