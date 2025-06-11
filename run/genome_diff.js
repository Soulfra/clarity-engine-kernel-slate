const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const GENOME_DIFF_PATH = path.resolve('admin/genome_diff.json');

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()).sort();
}

function computeDiff(fromId, toId) {
  const fromFiles = new Set(listFiles(path.join('vaults', fromId)));
  const toFiles = new Set(listFiles(path.join('vaults', toId)));
  const added = [...toFiles].filter(f => !fromFiles.has(f));
  const removed = [...fromFiles].filter(f => !toFiles.has(f));
  const parts = [];
  if (added.length) parts.push(`added ${added.join(', ')}`);
  if (removed.length) parts.push(`removed ${removed.join(', ')}`);
  return parts.join('; ') || 'no changes';
}

function logDiff(vaultId, fromId, summary) {
  ensureFileAndDir(GENOME_DIFF_PATH, '[]');
  const log = JSON.parse(fs.readFileSync(GENOME_DIFF_PATH, 'utf-8'));
  log.push({ vault_id: vaultId, diff_from: fromId, summary });
  fs.writeFileSync(GENOME_DIFF_PATH, JSON.stringify(log, null, 2));
}

function run(vaultId, fromId) {
  const summary = computeDiff(fromId, vaultId);
  logDiff(vaultId, fromId, summary);
}

if (require.main === module) {
  const [vaultId, fromId] = process.argv.slice(2);
  if (!vaultId || !fromId) {
    console.error('Usage: node run/genome_diff.js <vaultId> <fromId>');
    process.exit(1);
  }
  run(vaultId, fromId);
}

module.exports = { computeDiff };
