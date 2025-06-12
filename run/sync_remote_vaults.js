const fs = require('fs');
const path = require('path');
const { syncFromPeer, decodeBundle } = require('../engine/vault_syncer');

function loadData(p) {
  if (!fs.existsSync(p)) throw new Error('path_not_found');
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    const regPath = path.join(p, 'registry.json');
    const data = { registry: [] };
    if (fs.existsSync(regPath)) {
      data.registry = JSON.parse(fs.readFileSync(regPath, 'utf-8'));
    }
    return data;
  }
  if (p.endsWith('.zip')) {
    return decodeBundle(p);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function main() {
  const [, , src] = process.argv;
  if (!src) {
    console.log('Usage: node run/sync_remote_vaults.js <path_or_zip>');
    process.exit(1);
  }
  try {
    const data = loadData(src);
    const peerId = data.peer_id || 'unknown';
    const res = syncFromPeer(data, peerId);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Sync failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadData, main };
