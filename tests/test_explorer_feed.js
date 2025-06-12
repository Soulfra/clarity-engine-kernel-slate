const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeFeeds } = require('../engine/feed_builder');

describe('Explorer feed builder', () => {
  let tempDir;
  let cwd;

  beforeEach(() => {
    cwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'explorer-feed-'));
    fs.mkdirSync(path.join(tempDir, 'admin'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'sync'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'admin/export_log.json'), JSON.stringify([
      { vault_id: 'v1' },
      { vault_id: 'v1' },
      { vault_id: 'v2' }
    ], null, 2));
    const registry = [
      { vault_id: 'v1', parent: null, origin: 'alice' },
      { vault_id: 'v2', parent: 'v1', origin: 'bob' },
      { vault_id: 'v3', parent: null, origin: 'carol' }
    ];
    fs.writeFileSync(path.join(tempDir, 'vault_registry.json'), JSON.stringify(registry, null, 2));
    const trust = {
      v1: { trust_score: 4.9, public: true },
      v2: { trust_score: 4.7, public: true },
      v3: { trust_score: 3, public: false }
    };
    fs.writeFileSync(path.join(tempDir, 'sync/trust_log.json'), JSON.stringify(trust, null, 2));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('generates correct feed data', () => {
    writeFeeds('explorer', '.');
    const feed = JSON.parse(fs.readFileSync('explorer/feed_registry.json', 'utf-8'));
    const tree = JSON.parse(fs.readFileSync('explorer/remix_tree.json', 'utf-8'));

    expect(feed.length).toBe(2);
    const v1 = feed.find(v => v.vault_id === 'v1');
    expect(v1.export_count).toBe(2);
    expect(v1.remix_count).toBe(1);

    expect(tree.v2.parent).toBe('v1');
    expect(tree.v1.children.includes('v2')).toBe(true);
  });
});
