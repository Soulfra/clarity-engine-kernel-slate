const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const { execSync } = require('child_process');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { run: loopRunner } = require('../engine/LoopRunner');

const SESSION_LOG = path.resolve(__dirname, 'session_log.json');
const TEMPLATE_DIR = path.resolve(__dirname, '../templates/first_run_bundle');
const VAULTS_DIR = path.resolve('vaults');
const USER_ID_FILE = path.resolve(__dirname, 'user_id.txt');

function fingerprint() {
  if (fs.existsSync(USER_ID_FILE)) {
    return fs.readFileSync(USER_ID_FILE, 'utf-8');
  }
  const id = crypto.randomBytes(4).toString('hex');
  ensureFileAndDir(USER_ID_FILE, id);
  return id;
}

function loadSession() {
  if (!fs.existsSync(SESSION_LOG)) {
    ensureFileAndDir(SESSION_LOG, JSON.stringify({}));
  }
  try {
    return JSON.parse(fs.readFileSync(SESSION_LOG, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSession(data) {
  fs.writeFileSync(SESSION_LOG, JSON.stringify(data, null, 2));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function forkVault() {
  const vaultId = crypto.randomBytes(4).toString('hex');
  const vaultPath = path.join(VAULTS_DIR, vaultId);
  copyDir(TEMPLATE_DIR, vaultPath);
  return { vaultId, vaultPath };
}

function exportVault(vaultPath) {
  const exportFile = path.join(vaultPath, 'export_bundle.zip');
  try {
    execSync(`zip -r ${exportFile} .`, { cwd: vaultPath });
    return exportFile;
  } catch (err) {
    console.error('Export failed:', err.message);
    return null;
  }
}

async function runLoop(vaultPath) {
  process.env.INPUT_FILE = path.join(vaultPath, 'seed_chatlog.txt');
  process.env.VAULT_DIR = vaultPath;
  process.env.LOOP_LOG = path.join(vaultPath, 'loop_log.json');
  await loopRunner();
}

async function startExperience() {
  const userId = fingerprint();
  const session = loadSession();
  const { vaultId, vaultPath } = forkVault();

  if (!session.user_id) session.user_id = userId;
  session.vault_id = vaultId;
  session.agents_run = [];
  session.exports = [];
  session.earned_credits = 0;

  await runLoop(vaultPath);
  session.agents_run.push('LoopRunner');

  const exportPath = exportVault(vaultPath);
  if (exportPath) session.exports.push(path.relative('.', exportPath));

  saveSession(session);
  return { userId, vaultId, vaultPath, exportPath };
}

function startServer(port = 3456) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/start') {
      const info = await startExperience();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(info));
      return;
    }

    if (req.url === '/api/session') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loadSession()));
      return;
    }

    let filePath = path.join(__dirname, 'ui_shell.html');
    if (req.url !== '/') {
      filePath = path.join(__dirname, req.url);
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const data = fs.readFileSync(filePath);
    res.writeHead(200);
    res.end(data);
  });

  server.listen(port, () => {
    console.log(`Soulfra shell listening on http://localhost:${port}`);
  });
}

module.exports = { startExperience, startServer };

if (require.main === module) {
  startServer();
}
