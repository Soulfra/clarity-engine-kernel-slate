const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function loadJson(file, defVal) {
  if (!fs.existsSync(file)) return defVal;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return defVal;
  }
}

function loadRegistry(rootDir = '.') {
  const regPath = path.join(rootDir, 'vault_registry.json');
  let reg = loadJson(regPath, []);
  if (reg && reg.vaults) reg = reg.vaults;
  return Array.isArray(reg) ? reg : [];
}

function buildFeedRegistry(rootDir = '.') {
  const registry = loadRegistry(rootDir);
  const trust = loadJson(path.join(rootDir, 'sync/trust_log.json'), {});
  const exports = loadJson(path.join(rootDir, 'admin/export_log.json'), []);

  const map = {};
  for (const v of registry) {
    const id = v.vault_id || v.name || v.id;
    if (!id) continue;
    const trustData = trust[id] || {};
    if (trustData.public !== true) continue;
    if (!map[id]) {
      map[id] = {
        vault_id: id,
        summary: trustData.summary || v.summary || '',
        trust_score: trustData.trust_score || 0,
        remix_count: 0,
        export_count: 0,
        creator: v.origin || v.creator || trustData.creator || null
      };
    }
  }

  for (const v of registry) {
    const parent = v.parent;
    const id = v.vault_id || v.name || v.id;
    if (parent && map[parent]) map[parent].remix_count++;
  }

  for (const e of exports) {
    if (e.vault_id && map[e.vault_id]) map[e.vault_id].export_count++;
  }

  return Object.values(map);
}

function buildRemixTree(rootDir = '.') {
  const registry = loadRegistry(rootDir);
  const tree = {};
  for (const v of registry) {
    const id = v.vault_id || v.name || v.id;
    if (!id) continue;
    if (!tree[id]) tree[id] = { parent: v.parent || null, children: [] };
  }
  for (const v of registry) {
    const id = v.vault_id || v.name || v.id;
    if (!id) continue;
    const parent = v.parent;
    if (parent) {
      if (!tree[parent]) tree[parent] = { parent: null, children: [] };
      tree[parent].children.push(id);
    }
  }
  return tree;
}

function gatherContributors(rootDir = '.') {
  const walletsDir = path.join(rootDir, 'wallets');
  const registry = loadRegistry(rootDir);
  const contributors = [];
  if (!fs.existsSync(walletsDir)) return contributors;
  for (const dir of fs.readdirSync(walletsDir)) {
    if (dir === 'template') continue;
    const walletFile = path.join(walletsDir, dir, 'wallet.json');
    if (!fs.existsSync(walletFile)) continue;
    const w = loadJson(walletFile, {});
    const vaultCount = registry.filter(r => r.origin === dir).length;
    contributors.push({
      user: dir,
      vaults_submitted: vaultCount,
      credits_earned: w.credits_earned || 0,
      badges: w.badges || [],
      remix_score: w.remix_score || 0
    });
  }
  return contributors;
}

function gatherAgentGallery(rootDir = '.') {
  const file = path.join(rootDir, 'plugins/agent_registry.json');
  const data = loadJson(file, {});
  return Object.entries(data).map(([name, info]) => ({
    name,
    summary: info.summary || '',
    trust: info.trust_score || 0,
    model: info.model || '',
    credits_per_use: info.credits_per_use || 0
  }));
}

function writeFeeds(outDir = 'explorer', rootDir = '.') {
  const feed = buildFeedRegistry(rootDir);
  const tree = buildRemixTree(rootDir);
  const contributors = gatherContributors(rootDir);
  const gallery = gatherAgentGallery(rootDir);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'feed_registry.json'), JSON.stringify(feed, null, 2));
  fs.writeFileSync(path.join(outDir, 'remix_tree.json'), JSON.stringify(tree, null, 2));
  fs.writeFileSync(path.join(outDir, 'contributors.json'), JSON.stringify(contributors, null, 2));
  fs.writeFileSync(path.join(outDir, 'agent_gallery.json'), JSON.stringify(gallery, null, 2));

  return { feed, tree, contributors, gallery };
}

if (require.main === module) {
  writeFeeds(path.resolve('explorer'));
}

module.exports = { buildFeedRegistry, buildRemixTree, gatherContributors, gatherAgentGallery, writeFeeds };
