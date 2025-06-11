const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const REGISTRY_FILE = path.resolve('plugins/agent_registry.json');
const MANIFEST_FILE = path.resolve('plugins/agent_manifest.json');

function loadJson(file, def) {
  ensureFileAndDir(file, JSON.stringify(def, null, 2));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(def));
  }
}

function saveJson(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hashFile(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return '';
  }
}

function install(bundlePath) {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
  if (!bundle.agent_id || !bundle.file) {
    throw new Error('invalid_bundle');
  }

  const registry = loadJson(REGISTRY_FILE, {});
  registry[bundle.agent_id] = bundle;
  saveJson(REGISTRY_FILE, registry);

  const manifest = loadJson(MANIFEST_FILE, []);
  manifest.push({
    agent_id: bundle.agent_id,
    origin_vault: bundle.origin_vault || 'local',
    install_date: new Date().toISOString(),
    hash: hashFile(bundle.file),
    last_use: null
  });
  saveJson(MANIFEST_FILE, manifest);
  return bundle.agent_id;
}

if (require.main === module) {
  const [, , bundlePath] = process.argv;
  if (!bundlePath) {
    console.log('Usage: node run/install_agent.js <bundle.json>');
    process.exit(1);
  }
  try {
    const id = install(bundlePath);
    console.log(`Installed agent ${id}`);
  } catch (err) {
    console.error('Install failed:', err.message);
    process.exit(1);
  }
}

module.exports = install;
