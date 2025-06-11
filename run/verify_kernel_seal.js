const fs = require('fs');
const path = require('path');
const SealManager = require('../engine/SealManager');
const AgentRunner = require('../engine/AgentRunner');

const agentPath = process.argv[2];
if (!agentPath) {
  console.error('Usage: node verify_kernel_seal.js <agent.json>');
  process.exit(1);
}

const agent = JSON.parse(fs.readFileSync(agentPath, 'utf-8'));
const seal = SealManager.loadSeal();
if (!seal) {
  console.error('Kernel seal not found.');
  process.exit(1);
}

if (agent.kernel_fingerprint !== seal.kernel_fingerprint) {
  console.error('Kernel fingerprint mismatch.');
  process.exit(1);
}

console.log('Kernel seal verified. Running AgentRunner...');
AgentRunner.runAgent(agentPath);
