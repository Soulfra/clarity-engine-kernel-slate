const fs = require('fs');
const path = require('path');
const os = require('os');

const FILES = [
  'engine/vault_syncer.js',
  'run/sync_remote_vaults.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('Vault Syncer', () => {
  let tempDir;
  const orig = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-sync-'));
    for (const f of FILES) {
      const src = path.resolve(f);
      const dest = path.join(tempDir, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('sync', { recursive: true });
    fs.writeFileSync('sync/remote_registry.json', '[]');
    fs.writeFileSync('sync/sync_log.json', '[]');
  });

  afterEach(() => {
    process.chdir(orig);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('adds new vault and preserves referrer', () => {
    const syncer = require(path.join(tempDir, 'engine/vault_syncer.js'));
    const bundle = {
      peer_id: 'peerA',
      registry: [
        { vault_id: 'v1', fingerprint: 'abc', referrer: 'r1' }
      ]
    };
    const res = syncer.syncFromPeer(bundle, bundle.peer_id);
    expect(res.added).toContain('v1');
    const reg = JSON.parse(fs.readFileSync('sync/remote_registry.json', 'utf-8'));
    expect(reg.length).toBe(1);
    expect(reg[0].referrer).toBe('r1');
  });

  test('detects fingerprint conflict', () => {
    const syncer = require(path.join(tempDir, 'engine/vault_syncer.js'));
    const first = { peer_id: 'p1', registry: [{ vault_id: 'v1', fingerprint: 'abc' }] };
    syncer.syncFromPeer(first, first.peer_id);
    const second = { peer_id: 'p2', registry: [{ vault_id: 'v1', fingerprint: 'xyz' }] };
    const res = syncer.syncFromPeer(second, second.peer_id);
    expect(res.conflicts).toContain('v1');
    const log = JSON.parse(fs.readFileSync('sync/sync_log.json', 'utf-8'));
    expect(log[1].conflicts).toBe(1);
  });
});
