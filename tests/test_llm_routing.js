const fs = require('fs');
const path = require('path');
const os = require('os');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const FILES = [
  'engine/llm_router.js',
  'engine/model_configs.json',
  'engine/CreditManager.js',
  'engine/env_loader.js',
  'run/router_debug.js',
  'runtime/run_agent_with_model.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('LLM Routing', () => {
  let tempDir;
  const origCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-router-'));
    for (const rel of FILES) {
      const src = path.resolve(rel);
      const dest = path.join(tempDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('admin', { recursive: true });
    fs.writeFileSync('admin/model_usage_log.json', '[]');
    fs.writeFileSync('admin/router_policy.json', JSON.stringify({ 'gpt-4': { min_trust: 3 } }, null, 2));
    fs.writeFileSync('admin/router_stats.json', '{}');
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('uses preferred model when allowed and enforces cooldown', async () => {
    fs.mkdirSync('agents/a1', { recursive: true });
    fs.writeFileSync('agents/a1/agent.json', JSON.stringify({ preferred_model: 'claude' }, null, 2));
    fs.writeFileSync('admin/credits.json', JSON.stringify({ qr_user_001: { balance: 50 } }, null, 2));
    const router = require(path.join(tempDir, 'engine/llm_router.js'));
    const session = { user_id: 'qr_user_001', trust_level: 3, vault_id: 'v1' };
    const first = await router.routeRequest('a1', session, 'hello world');
    expect(first.model).toBe('claude');
    const stats = JSON.parse(fs.readFileSync('admin/router_stats.json', 'utf-8'));
    stats.claude.last_used = new Date().toISOString();
    fs.writeFileSync('admin/router_stats.json', JSON.stringify(stats, null, 2));
    const second = await router.routeRequest('a1', session, 'hello again');
    expect(second.model).not.toBe('claude');
  });

  test('falls back to local when credits insufficient', async () => {
    fs.mkdirSync('agents/a2', { recursive: true });
    fs.writeFileSync('agents/a2/agent.json', '{}');
    fs.writeFileSync('admin/credits.json', JSON.stringify({ qr_user_001: { balance: 0 } }, null, 2));
    const router = require(path.join(tempDir, 'engine/llm_router.js'));
    const session = { user_id: 'qr_user_001', trust_level: 3, vault_id: 'v1' };
    const res = await router.routeRequest('a2', session, 'testing fallback');
    expect(res.model).toBe('local');
  });
});
