const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const compress = require('../engine/memory_compressor');

function loadJson(file, def) {
  if (!fs.existsSync(file)) {
    ensureFileAndDir(file, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return def;
  }
}

function replay(vaultIds = []) {
  const summaryPath = compress(vaultIds);
  const exports = loadJson(path.resolve('admin/export_log.json'), []);
  const credits = loadJson(path.resolve('credits.json'), { balance: 0 });
  const llmLog = loadJson(path.resolve('runtime/llm_usage_log.json'), []);
  const trust = loadJson(path.resolve('sync/trust_log.json'), {});

  const result = {
    summary_file: path.relative('.', summaryPath),
    export_count: exports.length,
    credit_balance: credits.balance,
    llm_usage: llmLog.length,
    trust_entries: Object.keys(trust).length,
  };

  const badgeFile = path.resolve('badges/memory_log.json');
  const badge = loadJson(badgeFile, { cycles: 0 });
  badge.cycles += 1;
  badge.last_summary = result.summary_file;
  ensureFileAndDir(badgeFile);
  fs.writeFileSync(badgeFile, JSON.stringify(badge, null, 2));

  return result;
}

if (require.main === module) {
  const ids = process.argv.slice(2);
  const out = replay(ids);
  console.log(JSON.stringify(out, null, 2));
}

module.exports = replay;

