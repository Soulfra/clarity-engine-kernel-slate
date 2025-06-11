const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const runPreflight = require('./preflight_check');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function forkVault(base, outDir) {
  const id = `vault_${Date.now()}`;
  const dest = path.join(outDir, id);
  copyDir(base, dest);
  return dest;
}

function logLaunch(entry) {
  const file = path.resolve('admin/kernel_launch_log.json');
  ensureFileAndDir(file, '[]');
  let data = [];
  try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
  data.push(entry);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify');
  const forkFlag = args.includes('--fork') || args.includes('--clone');

  const preflight = runPreflight();
  if (!preflight.pass) {
    console.error('Preflight failed');
    logLaunch({ time: new Date().toISOString(), status: 'fail', details: preflight.results });
    process.exit(1);
  }
  if (verifyOnly) {
    console.log('Verification complete');
    logLaunch({ time: new Date().toISOString(), status: 'verify' });
    return;
  }

  let vaultPath = path.resolve('vaults/vault_0001_userseed');
  if (forkFlag) {
    vaultPath = forkVault(path.resolve('vaults/vault_0001_userseed'), path.resolve('vaults'));
    console.log('Forked vault at', vaultPath);
  }

  const proc = spawnSync('node', ['runtime/start.js', '--cli'], { stdio: 'inherit', env: { ...process.env, VAULT_DIR: vaultPath } });
  logLaunch({ time: new Date().toISOString(), status: 'run', code: proc.status, vault: path.basename(vaultPath) });
  if (proc.status !== 0) process.exit(proc.status);
}

if (require.main === module) {
  main();
}

module.exports = main;
