const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const qrcode = require('qrcode');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function usage() {
  console.log('Usage: node qr/loopcast_generator.js <vaultId>');
  process.exit(1);
}

const vaultId = process.argv[2];
if (!vaultId) usage();

const vaultPath = path.resolve('vaults', vaultId);
if (!fs.existsSync(vaultPath)) {
  console.error('Vault not found:', vaultPath);
  process.exit(1);
}

const outDir = path.resolve('loopcasts', vaultId);
fs.mkdirSync(outDir, { recursive: true });
const bundlePath = path.join(outDir, 'vault_bundle.zip');

try {
  execSync(`zip -r "${bundlePath}" .`, { cwd: vaultPath });
} catch (err) {
  console.error('Zip command failed:', err.message);
  process.exit(1);
}

function hashFile(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

const trustHash = hashFile(bundlePath);
const fingerprint = crypto.randomBytes(4).toString('hex');
const scanReward = 25;

const metadata = {
  vault_id: vaultId,
  qr_id: fingerprint,
  trust_hash: trustHash,
  fingerprint,
  credits_award: scanReward
};
fs.writeFileSync(path.join(outDir, 'loopcast_metadata.json'), JSON.stringify(metadata, null, 2));

const qrData = `loopcast:${vaultId}:${fingerprint}`;
qrcode.toFile(path.join(outDir, 'loopcast_qr.png'), qrData, { type: 'png' })
  .then(() => {
    const manifestPath = path.resolve('qr', 'qr_manifest.json');
    ensureFileAndDir(manifestPath, '[]');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.push({
      qr_id: fingerprint,
      vault_id: vaultId,
      created_by: process.env.USER || 'qr_user_001',
      timestamp: new Date().toISOString(),
      scan_reward: scanReward
    });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Loopcast generated for', vaultId);
  })
  .catch(err => {
    console.error('QR generation failed:', err.message);
  });
