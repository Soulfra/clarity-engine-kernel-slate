const fs = require('fs');
const path = require('path');
const os = require('os');

const FILES = [
  'engine/plugin_loader.js',
  'engine/llm_router.js',
  'engine/model_configs.json',
  'engine/CreditManager.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('Plugin Loader', () => {
  let tempDir;
  const origCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-test-'));
    for (const rel of FILES) {
      const src = path.resolve(rel);
      const dest = path.join(tempDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('admin', { recursive: true });
    fs.writeFileSync('admin/model_usage_log.json', '[]');
    fs.writeFileSync('admin/plugin_usage_log.json', '[]');
    fs.writeFileSync('admin/router_policy.json', '{}');
    fs.writeFileSync('admin/router_stats.json', '{}');
    fs.writeFileSync('admin/credits.json', JSON.stringify({ qr_user_001: { balance: 100 } }, null, 2));
    fs.mkdirSync('plugins', { recursive: true });
    fs.writeFileSync('plugins/agent_registry.json', JSON.stringify({
      good: { file: 'agents/good/agent.js', model: 'local', credits_per_use: 5, created_by: 'u', trust_score: 4 }
    }, null, 2));
    fs.writeFileSync('plugins/agent_manifest.json', '[]');
    fs.mkdirSync('agents/good', { recursive: true });
    fs.writeFileSync('agents/good/agent.json', '{}');
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('blocks untrusted agents', async () => {
    const reg = JSON.parse(fs.readFileSync('plugins/agent_registry.json', 'utf-8'));
    reg.bad = { file: 'agents/bad/agent.js', model: 'local', credits_per_use: 5, created_by: 'u', trust_score: 1 };
    fs.writeFileSync('plugins/agent_registry.json', JSON.stringify(reg, null, 2));
    fs.mkdirSync('agents/bad', { recursive: true });
    fs.writeFileSync('agents/bad/agent.json', '{}');
    const loader = require(path.join(tempDir, 'engine/plugin_loader.js'));
    await expect(loader.run('bad', { user_id: 'qr_user_001' }, 'test')).rejects.toThrow('untrusted_agent');
  });

  test('deducts credits and logs usage', async () => {
    const loader = require(path.join(tempDir, 'engine/plugin_loader.js'));
    const result = await loader.run('good', { user_id: 'qr_user_001', trust_level: 5, vault_id: 'v1' }, 'hello');
    expect(result).toBeDefined();
    const usage = JSON.parse(fs.readFileSync('admin/plugin_usage_log.json', 'utf-8'));
    expect(usage.length).toBe(1);
    const credits = JSON.parse(fs.readFileSync('admin/credits.json', 'utf-8'));
    expect(credits.qr_user_001.balance).toBe(95);
  });
});
