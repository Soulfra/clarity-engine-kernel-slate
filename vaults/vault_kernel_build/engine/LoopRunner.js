// LoopRunner.js - orchestrates the vault build loop
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseIntent, generateDocs } = require('./DocumentGenerator');
const ensureFileAndDir = require('../../../KERNEL_SLATE/shared/utils/ensureFileAndDir');

const BASE_DIR = path.resolve(__dirname, '..');
const INPUT_FILE = process.env.INPUT_FILE || path.join(BASE_DIR, 'input/seed_chatlog.txt');
const OUTPUT_DIR = path.join(BASE_DIR, 'output');
const LOG_FILE = path.join(OUTPUT_DIR, 'loop_log.json');

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) {
    ensureFileAndDir(LOG_FILE, '[]');
  }
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
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
  const logEntry = { id: loopId, timestamp, origin: INPUT_FILE, files: [], success: false };
  const log = loadLoopLog();

  try {
    if (!fs.existsSync(INPUT_FILE)) throw new Error('Input file missing');
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
function saveLog(entries) {
  ensureFileAndDir(LOG_FILE);
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2));
}

function fingerprint(files) {
  const hash = crypto.createHash('sha256');
  for (const f of files) {
    const data = fs.existsSync(f) ? fs.readFileSync(f) : '';
    hash.update(data);
  }
  return hash.digest('hex');
}

function generateId() {
  return crypto.randomBytes(4).toString('hex');
}

async function run() {
  const entries = loadLog();
  const entry = {
    timestamp: new Date().toISOString(),
    vault_id: generateId(),
    input_file: path.relative(BASE_DIR, INPUT_FILE),
    outputs: [],
    success: false,
  };

  try {
    if (!fs.existsSync(INPUT_FILE)) throw new Error('Seed chat log not found');
    const chat = fs.readFileSync(INPUT_FILE, 'utf-8');
    const parsed = parseIntent(chat);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const outFiles = generateDocs(parsed, OUTPUT_DIR);
    entry.outputs = outFiles.map(f => path.relative(BASE_DIR, f));

    // verify
    for (const f of outFiles) {
      if (!fs.existsSync(f)) throw new Error(`Missing output ${f}`);
    }
    entry.fingerprint = fingerprint(outFiles);
    entry.success = true;
  } catch (err) {
    entry.errors = err.message;
  }

  entries.push(entry);
  saveLog(entries);
  return entry;
}

if (require.main === module) {
  run().then(res => {
    if (res.success) console.log('Vault build complete:', res.vault_id);
    else console.error('Vault build failed:', res.errors);
  });
}

module.exports = { run };
