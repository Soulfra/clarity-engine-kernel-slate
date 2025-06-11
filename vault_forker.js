const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('./KERNEL_SLATE/shared/utils/ensureFileAndDir');
const CreditManager = require('./engine/CreditManager');

const seedPath = process.argv[2];
const seedNameArg = process.argv[3];

if (!seedPath) {
  console.error('Usage: node vault_forker.js <seedPath> [seedName]');
  process.exit(1);
}

const seedName = seedNameArg || path.basename(seedPath, path.extname(seedPath));
const userId = 'qr_user_001';
const cm = new CreditManager(userId);
const FORK_COST = 50;

if (!cm.hasCredits(FORK_COST)) {
  console.error('Insufficient credits to fork vault');
  process.exit(1);
}

const vaultRoot = path.resolve('vaults');
ensureFileAndDir(path.join(vaultRoot, '.placeholder'));
fs.rmSync(path.join(vaultRoot, '.placeholder'));

function nextVaultId() {
  const dirs = fs.readdirSync(vaultRoot, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('vault_'))
    .map(d => d.name);
  let max = 1;
  dirs.forEach(d => {
    const m = d.match(/^vault_(\d+)_/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return String(max + 1).padStart(4, '0');
}

const newId = nextVaultId();
const vaultId = `vault_${newId}_${seedName}`;
const destDir = path.join(vaultRoot, vaultId);

console.log('Creating vault:', vaultId);
fs.mkdirSync(destDir, { recursive: true });

// copy repository sans existing vaults and .git
fs.cpSync('.', destDir, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative('.', src);
    if (rel.startsWith('vaults')) return false;
    if (rel.startsWith('.git')) return false;
    return true;
  }
});

// copy seed file
const inputDir = path.join(destDir, 'input');
fs.mkdirSync(inputDir, { recursive: true });
fs.copyFileSync(seedPath, path.join(inputDir, path.basename(seedPath)));

cm.deduct(FORK_COST);

// update registry
const registryFile = path.resolve('vault_registry.json');
ensureFileAndDir(registryFile, '[]');
let registry = [];
try {
  registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
} catch {}
registry.push({
  vault_id: vaultId,
  seed: path.basename(seedPath),
  timestamp: new Date().toISOString(),
  origin: userId,
  loop_status: 'pending'
});
fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));

console.log('Vault forked at', destDir);
