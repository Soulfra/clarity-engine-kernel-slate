const fs = require('fs');
const path = require('path');
const os = require('os');

const FILES = [
  'engine/memory_compressor.js',
  'engine/memory_stitcher.js',
  'agents/replay_agent.js',
  'run/reflect_on_vaults.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('Memory Embedding', () => {
  let tempDir;
  const orig = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-embed-'));
    for (const f of FILES) {
      const src = path.resolve(f);
      const dest = path.join(tempDir, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('memory/memory_blobs', { recursive: true });
    fs.writeFileSync('memory/embedded_log.json', '[]');
    fs.mkdirSync('vaults/v1', { recursive: true });
    fs.writeFileSync('vaults/v1/SUMMARY.md', '# v1');
    fs.writeFileSync('vaults/v1/loop_log.json', '[{"id":1}]');
    fs.writeFileSync('agent_log.json', '[{}]');
    fs.mkdirSync('sync', { recursive: true });
    fs.writeFileSync('sync/trust_log.json', '{"t":1}');
  });

  afterEach(() => {
    process.chdir(orig);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('compresses and replays memory', () => {
    const compressor = require(path.join(tempDir, 'engine/memory_compressor.js'));
    const summaryPath = compressor(['v1']);
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    const log = JSON.parse(fs.readFileSync('memory/embedded_log.json', 'utf-8'));
    expect(log[0].fingerprint).toBe(summary.fingerprint);

    const replay = require(path.join(tempDir, 'agents/replay_agent.js'));
    const res = replay(['v1']);
    expect(res.summary_file).toBe(path.relative('.', summaryPath));
    expect(res.export_count).toBe(0);
    const badge = JSON.parse(fs.readFileSync('badges/memory_log.json', 'utf-8'));
    expect(badge.cycles).toBe(1);
  });
});

