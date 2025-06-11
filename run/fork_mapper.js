const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function loadRegistry() {
  const file = path.resolve('vault_registry.json');
  if (!fs.existsSync(file)) return { vaults: [] };
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function buildTree(registry) {
  const tree = {};
  (registry.vaults || []).forEach(v => {
    tree[v.vault_id] = { parent: v.parent, children: [] };
  });
  (registry.vaults || []).forEach(v => {
    if (v.parent && tree[v.parent]) {
      tree[v.parent].children.push(v.vault_id);
    }
  });
  return tree;
}

function writeTrees(tree) {
  for (const [vaultId, data] of Object.entries(tree)) {
    const filePath = path.join('vaults', vaultId, 'fork_tree.json');
    ensureFileAndDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

function run() {
  const registry = loadRegistry();
  const tree = buildTree(registry);
  writeTrees(tree);
}

if (require.main === module) {
  run();
}

module.exports = { run, buildTree };
