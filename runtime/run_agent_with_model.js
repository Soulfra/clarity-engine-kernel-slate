const { routeRequest } = require('../engine/llm_router');

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error('Usage: node run_agent_with_model.js <agentId>');
    process.exit(1);
  }
  const session = {
    user_id: process.env.QR_USER_ID || 'qr_user_001',
    vault_id: 'default_vault',
    trust_level: 3
  };
  try {
    const res = await routeRequest(agentId, session, 'run_task');
    console.log('Model used:', res.model);
    console.log('Result:', res.result);
  } catch (err) {
    console.error('Router error:', err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
