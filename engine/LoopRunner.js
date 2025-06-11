// LoopRunner - orchestrates vault generation loops
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseChat, generateDocs } = require('./DocumentGenerator');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const { execSync } = require('child_process');
const CreditManager = require('./CreditManager');

const INPUT_FILE = process.env.INPUT_FILE || path.resolve('input/seed_chatlog.txt');
const VAULT_DIR = process.env.VAULT_DIR || path.resolve('vaults/vault_kernel_build');
const LOOP_LOG = process.env.LOOP_LOG || path.resolve('loop_log.json');

function loadLoopLog() {
  if (!fs.existsSync(LOOP_LOG)) {
    ensureFileAndDir(LOOP_LOG, '[]');
  }
  try {
    return JSON.parse(fs.readFileSync(LOOP_LOG, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLoopLog(log) {
  ensureFileAndDir(LOOP_LOG);
  fs.writeFileSync(LOOP_LOG, JSON.stringify(log, null, 2));
}

function generateLoopId() {
  const h = crypto.createHash('sha256');
  h.update(Date.now().toString());
  return h.digest('hex').slice(0, 8);
}

async function run() {
  const loopId = generateLoopId();
  const timestamp = new Date().toISOString();
  const logEntry = { id: loopId, timestamp, origin: INPUT_FILE, files: [], success: false, user: USER_ID };
  const log = loadLoopLog();

  const cm = new CreditManager(USER_ID);

  try {
    if (!fs.existsSync(INPUT_FILE)) throw new Error('Input file missing');
    if (!cm.hasCredits(LOOP_COST)) throw new Error('Insufficient credits');
    cm.deduct(LOOP_COST, logEntry);
    const chat = fs.readFileSync(INPUT_FILE, 'utf-8');
    const parsed = parseChat(chat);
    const outDir = VAULT_DIR;
    fs.mkdirSync(outDir, { recursive: true });
    const files = generateDocs(parsed, outDir);
    logEntry.files = files.map(f => path.relative('.', f));
    // Create export zip if zip command is available
    try {
      execSync(`zip -r ${path.join(outDir, 'export.zip')} .`, { cwd: outDir });
      logEntry.files.push(path.relative('.', path.join(outDir, 'export.zip')));
    } catch (zipErr) {
      console.error('Zip step failed:', zipErr.message);
    }
    logEntry.success = true;
  } catch (err) {
    logEntry.error = err.message;
    console.error('Loop failed:', err.message);
  }

  log.push(logEntry);
  saveLoopLog(log);

  if (logEntry.success) {
    console.log('Loop complete:', loopId);
  } else {
    console.log('Loop failed:', loopId);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
