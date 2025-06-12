const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const REMOTE_REGISTRY = path.resolve('sync/remote_registry.json');
const SYNC_LOG = path.resolve('sync/sync_log.json');

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

function mergeEntries(remote, entries, peerId) {
  const conflicts = [];
  const added = [];
  const now = new Date().toISOString();
  for (const e of entries) {
    const existing = remote.find(r => r.vault_id === e.vault_id);
    if (!existing) {
      const entry = {
        vault_id: e.vault_id,
        fingerprint: e.fingerprint,
        lineage: e.lineage || [],
        referrer: e.referrer || null,
        source_peer: peerId,
        last_sync: now
      };
      remote.push(entry);
      added.push(e.vault_id);
    } else if (existing.fingerprint !== e.fingerprint) {
      conflicts.push(e.vault_id);
    } else {
      existing.last_sync = now;
      if (!existing.lineage && e.lineage) existing.lineage = e.lineage;
      if (!existing.referrer && e.referrer) existing.referrer = e.referrer;
    }
  }
  return { added, conflicts };
}

function syncFromPeer(bundle, peerId = 'unknown') {
  const registry = loadJson(REMOTE_REGISTRY, []);
  const results = mergeEntries(registry, bundle.registry || [], peerId);
  saveJson(REMOTE_REGISTRY, registry);

  const log = loadJson(SYNC_LOG, []);
  log.push({
    peer: peerId,
    timestamp: new Date().toISOString(),
    added: results.added.length,
    conflicts: results.conflicts.length
  });
  saveJson(SYNC_LOG, log);

  return results;
}

function decodeBundle(filePath) {
  const raw = fs.readFileSync(filePath);
  try {
    const json = zlib.gunzipSync(raw).toString('utf-8');
    return JSON.parse(json);
  } catch {
    return JSON.parse(raw.toString('utf-8'));
  }
}

module.exports = { syncFromPeer, decodeBundle };
