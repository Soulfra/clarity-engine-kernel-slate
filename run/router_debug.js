const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const CONFIG = path.resolve('engine/model_configs.json');
const POLICY = path.resolve('admin/router_policy.json');
const STATS = path.resolve('admin/router_stats.json');

function loadJson(file, def) {
  ensureFileAndDir(file, JSON.stringify(def, null, 2));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return def;
  }
}

function main() {
  const config = loadJson(CONFIG, {});
  const policy = loadJson(POLICY, {});
  const stats = loadJson(STATS, {});
  console.log('Model Configs:', config);
  console.log('Router Policy:', policy);
  console.log('Router Stats:', stats);
}

if (require.main === module) {
  main();
}

module.exports = main;
