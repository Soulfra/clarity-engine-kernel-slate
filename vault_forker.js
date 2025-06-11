const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('./KERNEL_SLATE/shared/utils/ensureFileAndDir');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      ensureFileAndDir(d);
      fs.copyFileSync(s, d);
    }
  }
}

function forkVault(sessionPath = 'qr_session.json') {
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
  const source = session.source_vault;
  const target = session.new_vault;
  const referrerId = session.referrer_id;
  copyDir(source, target);

  const id = crypto.randomBytes(4).toString('hex');
  const metadata = { id, parent: source, timestamp: new Date().toISOString() };
  if (referrerId) metadata.referrer_id = referrerId;
  const metaPath = path.join(target, 'metadata.json');
  ensureFileAndDir(metaPath);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  const registryPath = path.resolve('vault_registry.json');
  const registry = fs.existsSync(registryPath)
    ? JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    : [];
  registry.push({ id, path: target, parent: source, referrer_id: referrerId || null });
  ensureFileAndDir(registryPath);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  return metadata;
}

if (require.main === module) {
  const sessionPath = process.argv[2] || 'qr_session.json';
  forkVault(sessionPath);
}

module.exports = forkVault;
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
const { execSync } = require('child_process');

const ensureFileAndDir = require('./KERNEL_SLATE/shared/utils/ensureFileAndDir');

const REGISTRY = path.resolve('vault_registry.json');
const QR_SESSION = path.resolve('auth/qr_session.json');

function loadRegistry() {
  if (!fs.existsSync(REGISTRY)) {
    ensureFileAndDir(REGISTRY, '[]');
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
  } catch {
    return [];
  }
}

function saveRegistry(reg) {
  ensureFileAndDir(REGISTRY);
  fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2));
}

function nextId(reg) {
  const id = reg.length + 1;
  return String(id).padStart(4, '0');
}

function forkVault(inputFile) {
  if (!fs.existsSync(inputFile)) throw new Error('Input file not found');
  const reg = loadRegistry();
  const id = nextId(reg);
  const nameSlug = path.basename(inputFile).replace(/\s+/g, '_').replace(/\.[^/.]+$/, '');
  const vaultName = `vault_${id}_${nameSlug}`;
  const vaultDir = path.join('vaults', vaultName);
  // create structure
  fs.mkdirSync(path.join(vaultDir, 'engine'), { recursive: true });
  fs.mkdirSync(path.join(vaultDir, 'input'), { recursive: true });
  fs.mkdirSync(path.join(vaultDir, 'output'), { recursive: true });

  // copy engine and input
  fs.cpSync('engine', path.join(vaultDir, 'engine'), { recursive: true });
  const inputDest = path.join(vaultDir, 'input', path.basename(inputFile));
  fs.copyFileSync(inputFile, inputDest);

  // initialize log
  fs.writeFileSync(path.join(vaultDir, 'output', 'loop_log.json'), '[]');

  // copy qr session if exists
  if (fs.existsSync(QR_SESSION)) {
    fs.copyFileSync(QR_SESSION, path.join(vaultDir, 'qr_session.json'));
  }

  const entry = {
    id,
    name: vaultName,
    timestamp: new Date().toISOString(),
    source: path.relative('.', inputFile),
    loopSuccess: null
  };
  reg.push(entry);
  saveRegistry(reg);

  try {
    execSync('node engine/LoopRunner.js', { cwd: vaultDir, stdio: 'inherit' });
    entry.loopSuccess = true;
  } catch (err) {
    entry.loopSuccess = false;
    entry.error = err.message;
  }
  saveRegistry(reg);

  console.log('Created', vaultName);
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node vault_forker.js <input_file>');
    process.exit(1);
  }
  forkVault(input);
}

module.exports = { forkVault };
