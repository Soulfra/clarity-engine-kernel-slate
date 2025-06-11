const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { generateKernelFingerprint } = require('./SealManager');

const REGISTRY_FILE = path.resolve('patches/patch_registry.json');
const VERSION_FILE = path.resolve('admin/kernel_version.json');
const FINGERPRINT_FILE = path.resolve('.soulfra_fingerprint');

function loadJSON(file, def) {
  if (!fs.existsSync(file)) {
    ensureFileAndDir(file, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(def));
  }
}

function saveJSON(file, data) {
  ensureFileAndDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


function updateVersion(newVersion) {
  const version = loadJSON(VERSION_FILE, { version: '1.0.0', fingerprint: '', updated: '' });
  if (newVersion) version.version = newVersion;
  const fingerprint = generateKernelFingerprint('runtime');
  version.fingerprint = fingerprint;
  version.updated = new Date().toISOString();
  saveJSON(VERSION_FILE, version);
  fs.writeFileSync(FINGERPRINT_FILE, fingerprint);
  return version;
}

function applyPatch(patchPath, user = 'local_user') {
  if (!fs.existsSync(patchPath)) throw new Error('patch_not_found');
  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf-8'));
  if (!patch.patch_id || !Array.isArray(patch.files)) throw new Error('invalid_patch');

  const registry = loadJSON(REGISTRY_FILE, []);
  if (registry.find(p => p.patch_id === patch.patch_id)) throw new Error('already_applied');

  const currentFingerprint = fs.existsSync(FINGERPRINT_FILE) ? fs.readFileSync(FINGERPRINT_FILE, 'utf-8').trim() : '';
  if (patch.origin_fingerprint && patch.origin_fingerprint !== currentFingerprint) {
    throw new Error('fingerprint_mismatch');
  }

  const filesModified = [];
  for (const f of patch.files) {
    const dest = path.resolve(f.path);
    ensureFileAndDir(dest);
    fs.writeFileSync(dest, f.content);
    filesModified.push(f.path);
  }

  const entry = {
    patch_id: patch.patch_id,
    files_modified: filesModified,
    applied_by: user,
    credits_spent: patch.credits || 0,
    timestamp: new Date().toISOString(),
    origin_fingerprint: patch.origin_fingerprint || currentFingerprint,
  };
  registry.push(entry);
  saveJSON(REGISTRY_FILE, registry);

  updateVersion(patch.kernel_version);
  return entry;
}

module.exports = { applyPatch };
