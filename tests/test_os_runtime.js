const fs = require('fs');
const path = require('path');
const os = require('os');

const FILES = [
  'runtime/soulfra_os.js',
  'engine/LoopRunner.js',
  'engine/AgentRunner.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('OS Runtime', () => {
  let tmp;
  const orig = process.cwd();

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'osrt-'));
    for (const rel of FILES) {
      const src = path.resolve(rel);
      const dest = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tmp);
    fs.mkdirSync('vaults/vault_os_runtime', { recursive: true });
    fs.writeFileSync('vaults/vault_os_runtime/seed_chatlog.txt', 'hello');
    fs.writeFileSync('admin/credits.json', JSON.stringify({ qr_user_001: { balance: 100 } }, null, 2));
  });

  afterEach(() => {
    process.chdir(orig);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('startExperience logs session', async () => {
    const osRuntime = require(path.join(tmp, 'runtime/soulfra_os.js'));
    const info = await osRuntime.startExperience('vaults/vault_os_runtime');
    const log = JSON.parse(fs.readFileSync('runtime/os_session.json', 'utf-8'));
    expect(log.loops.length).toBe(1);
    expect(info.loops.length).toBe(1);
  });
});
