const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function appendJSON(file, entry) {
  ensureFileAndDir(file, '[]');
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  arr.push(entry);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function deploy(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) throw new Error('Target path missing');
  const bundle = path.join(resolved, 'soulfra_node_bundle.zip');
  execSync(`zip -r ${bundle} .`, { cwd: resolved });
  const logEntry = {
    user: process.env.USER || 'qr_user_001',
    method: 'CLI',
    hash: path.basename(bundle),
    result: 'success',
    child_vaults: []
  };
  appendJSON(path.resolve('admin/propagation_log.json'), logEntry);
  console.log('Deployment bundle created at', bundle);
  return bundle;
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.log('Usage: node run/deploy_node.js <target_path_or_name>');
    process.exit(1);
  }
  try {
    deploy(target);
  } catch (err) {
    console.error('Deploy failed:', err.message);
    process.exit(1);
  }
}

module.exports = deploy;
