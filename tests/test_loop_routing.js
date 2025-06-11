const fs = require('fs');
const path = require('path');
const os = require('os');

const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const FILES = [
  'engine/loop_router.js',
  'runtime/agent_sync.js',
  'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
];

describe('Loop Router', () => {
  let tempDir;
  const origCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-router-'));
    for (const rel of FILES) {
      const src = path.resolve(rel);
      const dest = path.join(tempDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
    fs.mkdirSync('runtime', { recursive: true });
    fs.writeFileSync(path.join('runtime', 'signal_log.json'), '[]');
    fs.mkdirSync('agents/agent_001', { recursive: true });
    fs.writeFileSync('agents/agent_001/agent_state.json', '{}');
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('handles trigger_loop and respects cooldown', async () => {
    const loopRouter = require(path.join(tempDir, 'engine/loop_router.js'));
    const logFile = path.resolve('runtime/signal_log.json');
    const first = { source: 'test', target: 'agent_001', action: 'trigger_loop', timestamp: new Date().toISOString() };
    fs.writeFileSync(logFile, JSON.stringify([first], null, 2));

    const handled = [];
    await loopRouter.routeSignals({ handlers: { trigger_loop: e => handled.push(e) }, cooldown: 10 });
    let data = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    expect(data[0].handled).toBe(true);
    expect(handled.length).toBe(1);

    data.push({ source: 'test2', target: 'agent_001', action: 'trigger_loop', timestamp: new Date().toISOString() });
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
    await loopRouter.routeSignals({ handlers: { trigger_loop: e => handled.push(e) }, cooldown: 100000 });
    data = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    expect(data[1].handled).not.toBe(true);
  });
});
