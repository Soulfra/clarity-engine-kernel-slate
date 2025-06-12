const fs = require('fs');
const path = require('path');

function exportBundle(agentId) {
  const draftDir = path.resolve('plugins/drafts', agentId);
  const specPath = path.join(draftDir, 'agent.json');
  const readmePath = path.join(draftDir, 'README.md');
  const trustPath = path.join(draftDir, 'trust.json');
  if (!fs.existsSync(specPath)) throw new Error('missing_agent');
  const bundle = {
    agent_id: agentId,
    spec: JSON.parse(fs.readFileSync(specPath, 'utf-8')),
    readme: fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '',
    trust: fs.existsSync(trustPath) ? JSON.parse(fs.readFileSync(trustPath, 'utf-8')) : {}
  };
  const out = path.resolve('plugins', `${agentId}_bundle.json`);
  fs.writeFileSync(out, JSON.stringify(bundle, null, 2));
  return out;
}

if (require.main === module) {
  const [, , id] = process.argv;
  if (!id) {
    console.log('Usage: node plugins/export_agent_bundle.js <agent_id>');
    process.exit(1);
  }
  try {
    const out = exportBundle(id);
    console.log('Bundle written to', out);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = exportBundle;
