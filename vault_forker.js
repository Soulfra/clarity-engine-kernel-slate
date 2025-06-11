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
