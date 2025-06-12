const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const FILES = [
  'engine/infinity_router.js',
  'run/convert_format.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('Format Conversion', () => {
  let tempDir;
  const orig = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-test-'));
    for (const f of FILES) {
      const src = path.resolve(f);
      const dest = path.join(tempDir, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('admin', { recursive: true });
    fs.writeFileSync('admin/credits.json', JSON.stringify({ tester: { balance: 5 } }, null, 2));
    fs.writeFileSync('sample.json', JSON.stringify({ hello: 'world' }, null, 2));
  });

  afterEach(() => {
    process.chdir(orig);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('json to markdown conversion logs entry', () => {
    execSync(`node run/convert_format.js sample.json --to=markdown --user=tester`);
    const out = fs.readFileSync('sample.md', 'utf-8');
    expect(out).toContain('hello');
    const log = JSON.parse(fs.readFileSync('admin/conversion_log.json', 'utf-8'));
    expect(log.length).toBe(1);
    expect(log[0].credits_used).toBe(1);
  });
});
