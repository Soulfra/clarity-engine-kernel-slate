const fs = require('fs');
const path = require('path');
const os = require('os');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const ENV_LOADER_SRC = path.resolve('engine/env_loader.js');

describe('Env Routing', () => {
  let tempDir;
  const origCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
    process.chdir(tempDir);
    fs.mkdirSync('engine', { recursive: true });
    fs.mkdirSync('admin', { recursive: true });
    fs.mkdirSync('runtime', { recursive: true });
    fs.mkdirSync('KERNEL_SLATE/shared/utils', { recursive: true });
    fs.copyFileSync(ENV_LOADER_SRC, path.join('engine', 'env_loader.js'));
    fs.copyFileSync(path.resolve('KERNEL_SLATE/shared/utils/ensureFileAndDir.js'),
      path.join('KERNEL_SLATE/shared/utils/ensureFileAndDir.js'));
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('injects keys into process.env and session file', () => {
    const envLoader = require(path.join(tempDir, 'engine/env_loader.js'));
    envLoader.setKey('qr_user_001', 'OPENAI_KEY', 'sk-test');
    const session = envLoader.injectEnv('qr_user_001', 'sess1');
    expect(session.OPENAI_KEY).toBe('sk-test');
    expect(process.env.OPENAI_KEY).toBe('sk-test');
    const sessionFile = JSON.parse(fs.readFileSync('runtime/session_env.json', 'utf-8'));
    expect(sessionFile.session).toBe('sess1');
  });
});
