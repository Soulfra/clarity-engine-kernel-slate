const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const CreditManager = require('../engine/CreditManager');

function runAgent(agentPath, vaultDir = '.', userId = 'qr_user_001') {
  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent file not found: ${agentPath}`);
  }
  const agent = JSON.parse(fs.readFileSync(agentPath, 'utf-8'));
  const cost = agent.cost || 0;
  const cm = new CreditManager(userId);

  const logEntry = {
    agent: path.basename(agentPath),
    timestamp: new Date().toISOString(),
    success: false
  };

  try {
    if (!cm.hasCredits(cost)) {
      throw new Error('Insufficient credits');
    }
    cm.deduct(cost, logEntry);
    console.log(`Executing agent: ${agent.name || logEntry.agent}`);
    logEntry.success = true;
  } catch (err) {
    logEntry.error = err.message;
    console.error('Agent run failed:', err.message);
  }

  const logPath = path.join(vaultDir, 'agent_log.json');
  ensureFileAndDir(logPath);
  fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));
}

if (require.main === module) {
  const agentFile = process.argv[2];
  const vaultDir = process.argv[3] || '.';
  try {
    runAgent(agentFile, vaultDir);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { runAgent };
