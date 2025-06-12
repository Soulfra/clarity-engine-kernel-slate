const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { run: runLoop } = require('../engine/LoopRunner');
const AgentRunner = require('../engine/AgentRunner');

const SESSION_FILE = path.resolve('runtime/os_session.json');

function loadSession() {
  ensureFileAndDir(SESSION_FILE, JSON.stringify({ agents: [], loops: [] }, null, 2));
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  } catch {
    return { agents: [], loops: [] };
  }
}

function saveSession(data) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

async function startLoop(vaultDir) {
  process.env.INPUT_FILE = path.join(vaultDir, 'seed_chatlog.txt');
  process.env.VAULT_DIR = vaultDir;
  process.env.LOOP_LOG = path.join(vaultDir, 'loop_log.json');
  await runLoop();
}

async function runAgent(agentPath, vaultDir = '.') {
  AgentRunner.runAgent(agentPath, vaultDir);
}

async function startExperience(vaultDir = 'vaults/vault_os_runtime', agentPath) {
  const session = loadSession();
  await startLoop(vaultDir);
  session.loops.push({ vault: vaultDir, timestamp: new Date().toISOString() });
  if (agentPath) {
    await runAgent(agentPath, vaultDir);
    session.agents.push({ agent: agentPath, timestamp: new Date().toISOString() });
  }
  saveSession(session);
  return session;
}

module.exports = { startExperience };

if (require.main === module) {
  const vault = process.argv[2] || 'vaults/vault_os_runtime';
  const agent = process.argv[3];
  startExperience(vault, agent).then(info => {
    console.log('OS runtime complete');
    console.log(info);
  });
}
