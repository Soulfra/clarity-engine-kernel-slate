const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const qrcode = require('qrcode');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { generateFingerprint } = require('../identity/fingerprint');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
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

function appendJSON(file, entry) {
  ensureFileAndDir(file, '[]');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.push(entry);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function build(outputDir = path.resolve('export/kernel_bundle')) {
  fs.mkdirSync(outputDir, { recursive: true });
  copyDir('agents', path.join(outputDir, 'agents'));
  copyDir('vaults', path.join(outputDir, 'vaults'));
  if (fs.existsSync('wallets')) {
    copyDir('wallets', path.join(outputDir, 'wallets'));
  }
  copyDir('runtime', path.join(outputDir, 'runtime'));
  fs.writeFileSync(path.join(outputDir, 'install.sh'), '#!/bin/sh\nnode runtime/start.js\n');

  const fp = generateFingerprint('kernel_propagator').identity_id;
  fs.writeFileSync(path.join(outputDir, 'fingerprint.txt'), fp);

  const manifestEntry = {
    origin_vault: 'vault_0001',
    trust_hash: fp,
    agent_count: fs.readdirSync('agents').length,
    wallet_fingerprint: fp.slice(0, 8),
    deployment_time: new Date().toISOString(),
    deployed_by: process.env.USER || 'qr_user_001'
  };
  appendJSON(path.resolve('export/propagation_manifest.json'), manifestEntry);

  const qrData = `install:${fp}`;
  return qrcode.toFile(path.join(outputDir, 'install_qr.png'), qrData, { type: 'png' })
    .then(() => {
      execSync('zip -r kernel_bundle.zip .', { cwd: outputDir });
      return path.join(outputDir, 'kernel_bundle.zip');
    });
}

if (require.main === module) {
  build().then(zip => console.log('Kernel bundle created at', zip))
    .catch(err => {
      console.error('Kernel build failed:', err.message);
      process.exit(1);
    });
}

module.exports = build;
