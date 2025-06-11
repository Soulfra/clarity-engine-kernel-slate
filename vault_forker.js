const fs = require('fs');
const path = require('path');
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
