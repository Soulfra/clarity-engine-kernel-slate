const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { generateKernelFingerprint } = require('../engine/SealManager');

function hashDirectory(dir) {
  const hash = crypto.createHash('sha256');
  function dig(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) dig(p);
      else if (e.isFile()) hash.update(fs.readFileSync(p));
    }
  }
  dig(dir);
  return hash.digest('hex');
}

function saveManifest() {
  const manifest = {
    included_vaults: fs.readdirSync('vaults').filter(v => v.startsWith('vault_')),
    agents: fs.readdirSync('agents'),
    export_date: new Date().toISOString(),
    runtime_hash: hashDirectory('runtime'),
    developer: process.env.DEVELOPER_ID || 'unknown'
  };
  fs.writeFileSync('kernel_manifest.json', JSON.stringify(manifest, null, 2));
  return manifest;
}

function packageKernel() {
  const seal = generateKernelFingerprint('runtime');
  fs.writeFileSync('.soulfra_fingerprint', seal);
  const manifest = saveManifest();
  const zipName = 'Soulfra_Kernel_Starter.zip';
  const files = ['engine', 'runtime', 'vaults', 'docs', '.env.example', 'kernel_manifest.json', '.soulfra_fingerprint'];
  execSync(`zip -r ${zipName} ${files.join(' ')}`, { stdio: 'inherit' });
  const logFile = path.resolve('admin/kernel_export_log.json');
  ensureFileAndDir(logFile, '[]');
  let data = [];
  try { data = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch {}
  data.push({ date: new Date().toISOString(), zip: zipName, manifest });
  fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
}

if (require.main === module) {
  packageKernel();
}

module.exports = packageKernel;
