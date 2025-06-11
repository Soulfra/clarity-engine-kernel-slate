const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function build(destination) {
  const outDir = destination || path.resolve('export/user_kit');
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync('badges/default.txt', path.join(outDir, 'badge.txt'));
  const qr = crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(path.join(outDir, 'invite_qr.txt'), qr);
  fs.copyFileSync('wallets/template/wallet.json', path.join(outDir, 'wallet.json'));
  execSync(`zip -r user_kit.zip .`, { cwd: outDir });
  return path.join(outDir, 'user_kit.zip');
}

if (require.main === module) {
  const zip = build();
  console.log('User kit created at', zip);
}

module.exports = build;
