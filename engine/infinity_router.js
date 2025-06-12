const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');
const CreditManager = require('./CreditManager');

const LOG_FILE = path.resolve('admin/conversion_log.json');

function loadLog() {
  ensureFileAndDir(LOG_FILE, '[]');
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLog(log) {
  ensureFileAndDir(LOG_FILE);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function convertContent(inputExt, outputExt, content) {
  // Simple text-based conversions
  if (inputExt === '.json' && outputExt === '.md') {
    return '```json\n' + JSON.stringify(JSON.parse(content), null, 2) + '\n```';
  }
  if (inputExt === '.json' && outputExt === '.txt') {
    return JSON.stringify(JSON.parse(content), null, 2);
  }
  if ((inputExt === '.md' || inputExt === '.txt') && outputExt === '.json') {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return JSON.stringify({ text: content }, null, 2);
    }
  }
  throw new Error('unsupported_conversion');
}

async function convertFile(input, output, options = {}) {
  const userId = options.userId || 'system';
  const cm = new CreditManager(userId);
  if (!cm.hasCredits(1)) throw new Error('insufficient_credits');

  const inputExt = path.extname(input).toLowerCase();
  const outputExt = path.extname(output).toLowerCase();

  const logEntry = {
    input: path.relative('.', input),
    output: path.relative('.', output),
    router: 'infinity_router',
    credits_used: 1,
    timestamp: new Date().toISOString(),
    vault_id: options.vault_id || 'unknown',
    trust: 'unverified'
  };

  const content = fs.readFileSync(input, 'utf-8');
  let result;

  if (outputExt === '.png') {
    await QRCode.toFile(output, content);
    result = null;
  } else {
    result = convertContent(inputExt, outputExt, content);
    ensureFileAndDir(output);
    fs.writeFileSync(output, result);
  }

  cm.deduct(1, logEntry);
  const log = loadLog();
  log.push(logEntry);
  saveLog(log);
  return output;
}

function convert(input) {
  return {
    to: (out, opts) => convertFile(input, out, opts)
  };
}

module.exports = { convert, convertFile };
