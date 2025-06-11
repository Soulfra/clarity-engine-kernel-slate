// DocumentGenerator.js - generates documentation from a seed chat log
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../../../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function parseIntent(chatText) {
  const lines = chatText.trim().split(/\r?\n/).filter(Boolean);
  const intent = lines[0] || '';
  const rest = lines.slice(1).join(' ');
  return { intent, rest, full: chatText };
}

function writeFile(filePath, content) {
  ensureFileAndDir(filePath);
  fs.writeFileSync(filePath, content);
}

function generateDocs(parsed, outDir) {
  const files = [];
  const readme = `# Soulfra Vault Kernel\n\n${parsed.intent}\n\n${parsed.rest}`;
  const systemIntent = `# System Intent\n\n${parsed.full}`;
  const task = '# Task T01 - LoopRunner\n\nCreate the LoopRunner module that orchestrates document generation and logging.';

  const readmePath = path.join(outDir, 'README.md');
  writeFile(readmePath, readme);
  files.push(readmePath);

  const sysIntentPath = path.join(outDir, 'SystemIntent.md');
  writeFile(sysIntentPath, systemIntent);
  files.push(sysIntentPath);

  const taskPath = path.join(outDir, 'T01_LoopRunner.md');
  writeFile(taskPath, task);
  files.push(taskPath);

  return files;
}
module.exports = { parseChat, generateDocs };
=======
module.exports = { parseIntent, generateDocs };
