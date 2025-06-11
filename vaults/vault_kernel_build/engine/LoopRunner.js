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
